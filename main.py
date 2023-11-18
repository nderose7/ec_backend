from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import os
import re
from typing import List
from fastapi.responses import StreamingResponse
import json
import asyncio
from fastapi.responses import JSONResponse


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
    title: str = "Any"
    ingredients: str = "Any"
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
    prompt_text = f"I have the following dish/recipe name: {request.title} and the following ingredients: {request.ingredients}."
    prompt_text += f" Give me one "
    prompt_text += f"{request.course.lower()} recipe" if request.course != "Any" else "recipe idea"
    prompt_text += f" from {request.cuisine} cuisine" if request.cuisine != "Any" else ""
    prompt_text += f" that is"
    prompt_text += f" of difficulty type {request.difficulty.lower()}" if request.difficulty != "Any" else " for any difficulty level"
    prompt_text += f" and suitable for a {request.diet} diet." if request.diet != "Any" else "."
    prompt_text += f" Recipe should have creative original names/titles unless they are classic recipes. Recipe should be 'insanely good' tasting, and on an imagination/uniqueness scale of 1-5, it should be a {request.uniqueness}. For beer/wine/cocktails, suggest options from the region the recipe is from if one exists. If ingredients or dish name is 'Surprise me': generate a random recipe from a random cuisine from a random nation."
    prompt_text += " Please format the recipe as follows:\n"
    prompt_text += f" Recipe Name: {request.title}\n Prep Time: [time]\n Cook Time: [time]\n Total Time: [time]\n Servings: [number]\n Course: [course type]\n Cuisine Type: [cuisine type]\n Calories: [amount]\n Diet Type If Set: [text]\n Paragraph Description: [text]\n Ingredients: [list]\n Cooking Instructions: [steps]\n Cooking Notes: [list]\n Beer Pairing: [text]\n Wine Pairing: [text]\n Cocktail Pairing: [text]\n Recipe End: [end]\n"

    # Debugging - print out the constructed prompt to check its correctness before sending to API
    print("Sending the following prompt to the API:", prompt_text)

    
    #temperature_value = {
    #    '1': 0.7,
    #    '2': 0.8,
    #    '3': 1.25,
    #    '4': 1.5,
    #    '5': 1.8
    #}.get(request.uniqueness, 0) 

    recipe_name = None


    # Define an async generator function to stream results from the OpenAI API
    async def generate():
        buffer = ""  # Buffer to accumulate data
        current_key = None  # Variable to keep track of the current key being processed
        current_value = ""  # Variable to store the current value
        nonlocal recipe_name

        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    client.chat.completions.create,
                    model="gpt-3.5-turbo-1106",
                    messages=[
                        {"role": "system", "content": "You are a master of culinary arts."},
                        {"role": "user", "content": prompt_text}
                    ],
                    temperature=1.2,
                    stream=True
                ),
                timeout=60.0  # Timeout in seconds, adjust as needed
            )
            
            for chat_completion_chunk in response:
                choice = chat_completion_chunk.choices[0]

                buffer += choice.delta.content if choice.delta.content is not None else ""
                # print(f"Buffer after appending: '{buffer}'")

                while "\n" in buffer:
                    line, _, remaining = buffer.partition("\n")
                    line = line.strip()

                    if line == "":
                        # print("Skipping empty line")
                        buffer = remaining
                        continue

                    if ":" in line:  # This line is a key-value pair
                        # If we already have a key, process and yield the current key-value pair
                        if current_key is not None:
                            formatted_section = format_keys({current_key: current_value or ""})
                            json_chunk = json.dumps(formatted_section) + "\n"
                            yield json_chunk.encode('utf-8')

                        if current_key == "recipe_name": 
                            # Store the recipe name
                            recipe_name = current_value
                            print(f"Recipe Name Captured: {recipe_name}")

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
                        yield json.dumps({"incomplete_data": buffer.strip()}).encode('utf-8') + b"\n"
                    break

        except asyncio.TimeoutError:
            print("OpenAI Chat completion request timed out.")
            # Handle the timeout case as needed, maybe return an error message or empty response

        except Exception as e:
            print("An exception occurred: ", str(e))
            error_message = json.dumps({"error": str(e)}) + "\n"
            yield error_message.encode('utf-8')

        # After streaming recipe data, check if recipe name was captured
        if recipe_name:
            image_url = await generate_dalle_image(recipe_name)
            if image_url:
                # Send the image URL as a final piece of data
                yield json.dumps({"image_url": image_url}).encode('utf-8')

    async def generate_dalle_image(recipe_name):
        prompt_for_image = f"Create a highly detailed and realistic image of {recipe_name}. The image should vividly depict the dish's colors, textures, and key ingredients. Include visual elements like garnishes, the type of plate or bowl it's served in, and any side items or accompaniments that are typically served with it. The goal is to make the image as appetizing and true-to-life as possible, capturing the essence of the dish's flavors and presentation."

        try:
            response = client.images.generate(
                model="dall-e-3",
                prompt=prompt_for_image,
                n=1,
                size="1024x1024"
            )
            image_url = response.data[0].url  # Assuming the first image is what you need
            print(f"image_url: ", image_url)
            return image_url
        except Exception as e:
            print("DALL-E Image generation exception: ", str(e))
            return None
    
    return StreamingResponse(generate(), media_type="application/x-ndjson")


@app.post("/get-recipe-title/", response_class=JSONResponse)
async def get_recipe_title(request: RecipeRequest):
    # Construct the prompt from the request with an example format
    prompt_text = f"I have the following ingredients or dish name: {request.ingredients}."
    prompt_text += f" Give me one "
    prompt_text += f"{request.course.lower()} recipe" if request.course != "Any" else "recipe idea"
    prompt_text += f" from {request.cuisine} cuisine" if request.cuisine != "Any" else ""
    prompt_text += f" that is"
    prompt_text += f" of difficulty type {request.difficulty.lower()}" if request.difficulty != "Any" else " for any difficulty level"
    prompt_text += f" and suitable for a {request.diet} diet." if request.diet != "Any" else "."
    prompt_text += f" Recipe should have creative original names/titles unless they are classic recipes. Recipe should be 'insanely good' tasting, and on an imagination/uniqueness scale of 1-5, it should be a {request.uniqueness}. If ingredients or dish name is 'Surprise me': generate a random recipe from a random cuisine from a random nation."
    prompt_text += " For now, just give me the recipe name. Please format the recipe as follows:\n"
    prompt_text += " Recipe Name: [name]\n Recipe End: [end]\n"

    # Debugging - print out the constructed prompt to check its correctness before sending to API
    print("Sending the following prompt to the API:", prompt_text)

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo-1106",
            messages=[
                {"role": "system", "content": "You are a master of culinary arts."},
                {"role": "user", "content": prompt_text}
            ],
            temperature=1.2
        )
        print("Response:", response)

        # Extract the recipe title
        if response.choices and len(response.choices) > 0:
            content = response.choices[0].message.content
            # Parsing the content to extract the recipe name
            if "Recipe Name:" in content and "\n" in content:
                start = content.find("Recipe Name:") + len("Recipe Name:")
                end = content.find("\n", start)
                recipe_name = content[start:end].strip()
                print(f"recipe_name: ", recipe_name)
                return {"recipe_name": recipe_name}
            else:
                print("Recipe name not found in response")
                return {"error": "Recipe name not found"}
        else:
            print("Invalid response structure")
            return {"error": "Invalid response structure"}

    except Exception as e:
        print("Get recipe title from API exception: ", str(e))
        return {"error": str(e)}

    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)