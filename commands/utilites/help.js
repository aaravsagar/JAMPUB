import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),

  async execute(interaction) {
    const commands = interaction.client.commands;
    const embeds = [];
    const baseEmbed = new EmbedBuilder()
      .setTitle('Help — Commands')
      .setColor(0x0099ff);

    if (!commands || commands.size === 0) {
      baseEmbed.setDescription('No commands available.');
      return interaction.reply({ embeds: [baseEmbed], ephemeral: true });
    }

    // Discord limits 25 fields per embed — paginate if needed
    let current = new EmbedBuilder(baseEmbed);
    let fieldCount = 0;

    for (const cmd of commands.values()) {
      const name = cmd?.data?.name ?? 'unknown';
      const desc = (cmd?.data?.description ?? 'No description').toString();

      // if adding this field would exceed 25, push current and start new
      if (fieldCount >= 25) {
        embeds.push(current);
        current = new EmbedBuilder(baseEmbed);
        fieldCount = 0;
      }

      current.addFields({ name: `/${name}`, value: desc.length ? desc : 'No description', inline: false });
      fieldCount++;
    }

    embeds.push(current);

    // Reply with first embed and follow up additional ones if present
    await interaction.reply({ embeds: [embeds[0]], ephemeral: true });

    for (let i = 1; i < embeds.length; i++) {
      // followUp so the user still sees all pages; keep ephemeral
      await interaction.followUp({ embeds: [embeds[i]], ephemeral: true });
    }
  }
};