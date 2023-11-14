from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import os
import re
from typing import List
from fastapi.responses import StreamingResponse
import json


client = OpenAI()
app = FastAPI()
client.api_key = os.getenv("OPENAI_API_KEY")

# Add CORS middleware to allow all origins, all methods, and all headers.
# You should restrict this in a production application.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Define your data model for the list of ingredients and the output recipe format
class Ingredients(BaseModel):
    ingredients: list[str]



# Extend the Ingredients model to include the new filters
class RecipeRequest(BaseModel):
    ingredients: list[str]
    course: str = "Any"  # Default value if not specified
    cuisine: str = "Any"  # Default value if not specified
    difficulty: str = "Any"  # Default value if not specified
    diet: str = "Any"  # Default value if not specified
    uniqueness: str = "2"  # Default value if not specified





def format_keys(recipe):
    """Format the keys of a recipe dictionary."""
    formatted_recipe = {key.lower().replace(" ", "_"): value for key, value in recipe.items()}
    print(f"Formatted recipe: {formatted_recipe}")
    return formatted_recipe


@app.post("/get-recipes/", response_class=StreamingResponse)
async def get_recipes(request: RecipeRequest):
    # Construct the prompt from the request with an example format
    prompt_text = f"I have the following ingredients or dish name: {', '.join(request.ingredients)}." if request.ingredients != "Any" else ""
    prompt_text += f" Give me one "
    prompt_text += f"{request.course.lower()} recipe" if request.course != "Any" else "recipe idea"
    prompt_text += f" from {request.cuisine} cuisine" if request.cuisine != "Any" else ""
    prompt_text += f" that are/is"
    prompt_text += f" of difficulty type {request.difficulty.lower()}" if request.difficulty != "Any" else " for any difficulty level"
    prompt_text += f" and suitable for a {request.diet} diet." if request.diet != "Any" else "."
    prompt_text += f" Recipe should be 'insanely good' and on an imagination/uniqueness scale of 1-5, it should be a {request.uniqueness}. If ingredients are 'suprise me', create a truly unique, random recipe."
    prompt_text += " Please format the recipe as follows:\n"
    prompt_text += " Recipe Name: [name]\n Prep Time: [time]\n Cook Time: [time]\n Total Time: [time]\n Servings: [number]\n Course: [course type]\n Cuisine Type: [cuisine type]\n Calories: [amount]\n Paragraph Description: [text]\n Ingredients: [list]\n Cooking Instructions: [steps]\n Cooking Notes: [list]\n Beer Pairing: [text]\n Wine Pairing: [text]\n Cocktail Pairing: [text]\n Recipe End: [end]\n"

    # Debugging - print out the constructed prompt to check its correctness before sending to API
    print("Sending the following prompt to the API:", prompt_text)

    
    #temperature_value = {
    #    '1': 1,
    #    '2': 1.1,
    #    '3': 1.2,
    #    '4': 1.3,
    #    '5': 1.4
    #}.get(request.uniqueness, 0) 


    # Define an async generator function to stream results from the OpenAI API
    async def generate():
        buffer = ""  # Buffer to accumulate data
        current_key = None  # Variable to keep track of the current key being processed
        current_value = ""  # Variable to store the current value
        
        try:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo-1106",
                messages=[
                    {"role": "system", "content": "You are a culinary assistant."},
                    {"role": "user", "content": prompt_text}
                ],
                temperature=0.8,
                stream=True
            )
            
            for chat_completion_chunk in response:
                choice = chat_completion_chunk.choices[0]

                buffer += choice.delta.content if choice.delta.content is not None else ""
                print(f"Buffer after appending: '{buffer}'")

                while "\n" in buffer:
                    line, _, remaining = buffer.partition("\n")
                    line = line.strip()

                    if line == "":
                        print("Skipping empty line")
                        buffer = remaining
                        continue

                    if ":" in line:  # This line is a key-value pair
                        # If we already have a key, process and yield the current key-value pair
                        if current_key is not None:
                            formatted_section = format_keys({current_key: current_value or ""})
                            json_chunk = json.dumps(formatted_section) + "\n"
                            yield json_chunk.encode('utf-8')

                        # Start processing the new key-value pair
                        current_key, current_value = line.split(":", 1)
                        current_key = current_key.strip().lower().replace(" ", "_")
                        current_value = current_value.strip()
                    else:
                        # Append to the current value if a key exists
                        if current_key is not None:
                            current_value += " " + line

                    buffer = remaining

                # Handle the end of the stream.
                if choice.finish_reason:
                    print(f"Handling end of the stream. Finish reason: {choice.finish_reason}")
                    if current_key is not None:
                        # Process and yield the last key-value pair
                        formatted_section = format_keys({current_key: current_value or ""})
                        json_chunk = json.dumps(formatted_section) + "\n"
                        yield json_chunk.encode('utf-8')
                    if buffer.strip():
                        yield json.dumps({"incomplete_data": buffer.strip()}).encode('utf-8')
                    break

        except Exception as e:
            print("An exception occurred: ", str(e))
            error_message = json.dumps({"error": str(e)}) + "\n"
            yield error_message.encode('utf-8')

    return StreamingResponse(generate(), media_type="application/x-ndjson")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)