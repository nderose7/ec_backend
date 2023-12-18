const fs = require('fs');
const path = require('path');

module.exports = {
  async afterCreate(event) {
    const { result } = event;

    // Check if the userdata has no avatar
    if (!result.avatar) {
      // List of default avatar images
      const defaultAvatars = [
        'assets/images/parrot-1.jpg',
        'assets/images/parrot-2.jpg',
        'assets/images/parrot-3.jpg',
        'assets/images/parrot-4.jpg'
      ];

      const selectedAvatarPath = path.join(__dirname, '../../../../', defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)]);
      const buffer = fs.readFileSync(selectedAvatarPath);

      const fileData = {
        name: path.basename(selectedAvatarPath),
        type: 'image/jpeg',
        size: buffer.length,
        buffer: buffer
      };

      const uploadResult = await strapi.plugins['upload'].services.upload.upload({
        data: {},
        files: {
          path: selectedAvatarPath,
          name: fileData.name,
          type: fileData.type,
          size: fileData.size,
          buffer: fileData.buffer
        },
      });

      await strapi.entityService.update('api::userdata.userdata', result.id, {
        data: {
          avatar: uploadResult[0].id
        }
      });

      

    }
  },
};
