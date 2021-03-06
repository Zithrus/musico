/* eslint-disable no-undef */
/* eslint-disable consistent-return */
const { Listener } = require('discord-akairo');
const Logger = require('../../util/logger');
const { stripIndents } = require('common-tags');
class GuildCreateListener extends Listener {
	constructor() {
		super('guildCreate', {
			event: 'guildCreate',
			emitter: 'client',
			category: 'client'
		});
	}

	async exec(guild) {
		Logger.info(`${guild.name} (${guild.id})`, { level: 'GUILD CREATE' });

		const members = await guild.members.fetch();
		const bots = members.filter(m => m.user.bot).size;
		const user = await this.client.users.fetch(guild.ownerID).catch(() => null);
		const channel = guild.channels.cache.filter(ch => ch.type === 'text').first();
		const invite = await channel.createInvite({ maxAge: 0 }).catch(() => null);
		const id = this.client.settings.get('global', 'guildLog', '710854402977693748');
		const webhook = await this.client.fetchWebhook(id).catch(() => null);
		if (!webhook) return;
		const joinembed = this.client.util.embed()
			.setColor(0x5e17eb)
			.setAuthor('Hello, I am Musico', 'https://gwabot.tk/images/logoround.png')
			.setFooter(`© ${new Date().getFullYear()} ${this.owner.username}#${this.owner.discriminator}`, this.owner.displayAvatarURL())
			.setDescription(stripIndents`Thanks for inviting!
		**___Hello I am Musico___**

		My default prefix is \`;\`
		Want a new prefix ? just type \`;prefix <new prefix>\`

		To get a list of commands type \`;help\`
		To get details for each command type \`;help <command>\`

		I am a public bot and can be added to as many servers you want!
		You can invite me to other servers using : [invite link](https://gwabot.tk/invite)

		**What can I do ?**
		**_I can :-_**
		<:discord:711151112501329920> **Play \`Music\`**,
		<:discord:711151112501329920> **Manage your server with my \`Moderation\` commands**,


		**_AND MUCH MORE_**

		**_Just Type \`;help\` to get started!_**
		`)
			.addField('Support', stripIndents`
		**_If you like my features, please consider voting me on_** : [vote link](https://top.gg/bot/629283787095932938/vote)

		**_If you need any help you can join our_** [support server](https://gwabot.tk/support)
		`);
		if (guild.channels.cache.filter(ch => ch.name.includes('general') && ch.type === 'text').map(m => m).length) {
			guild.channels.cache.filter(ch => ch.name.includes('general') && ch.type === 'text').first().send(joinembed);
		} else { channel.send(joinembed); }

		const embed = this.client.util.embed()
			.setColor('GREEN')
			.setAuthor('Musico - Joined a Guild!')
			.setThumbnail(guild.iconURL())
			.addField('Guild Info', [
				`Name: ${guild.name}`,
				`ID: ${guild.id}`,
				`Made: ${guild.createdAt}`,
				`Owner: ${user ? user.tag : 'Unknown'} (ID: ${guild.ownerID})`,
				`Region: ${guild.region}`,
				`Roles: ${guild.roles.cache.size}`,
				`Verification Level: ${guild.verificationLevel}`,
				`Members: ${guild.memberCount}`,
				`Bots: ${bots}`,
				`${invite ? `Invite link: ${invite}` : ''}`
			])
	  .setTimestamp();
	  return webhook.send({ embeds: [embed] });
	}

	get owner() {
		return this.client.users.cache.get(this.client.ownerID[0]);
	}
}

module.exports = GuildCreateListener;
