import { EmbedBuilder } from 'discord.js';

// Patch EmbedBuilder.toJSON to ensure a watermark footer on every embed sent
// This runs once (import this module early in index.js)
(function applyWatermarkPatch() {
  const proto = EmbedBuilder.prototype;
  if (!proto.__watermarkPatched) {
    const originalToJSON = proto.toJSON;
    proto.toJSON = function patchedToJSON(...args) {
      const data = originalToJSON.apply(this, args);

      const watermarkText = 'made by aaravsagar';

      // If footer exists, append watermark if not already present
      if (data.footer && data.footer.text) {
        if (!String(data.footer.text).includes(watermarkText)) {
          data.footer.text = `${data.footer.text} • ${watermarkText}`;
        }
      } else {
        // create footer if missing
        data.footer = { text: watermarkText };
      }

      return data;
    };
    proto.__watermarkPatched = true;
  }
})();