const { Command } = require('discord-akairo');

class BlacklistCommand extends Command {
	constructor() {
		super('blacklist', {
			aliases: ['blacklist', 'unblacklist'],
			description: {
				content: 'Blacklists or unblacklist a user',
				usage: '<user>',
				examples: ['@Ayush', '81440962496172032']
			},
			category: 'util',
			ownerOnly: true,
			ratelimit: 2,
			args: [
				{
					id: 'user',
					match: 'content',
					type: 'user',
					prompt: {
						start: 'who would you like to blacklist/unblacklist?'
					}
				}
			]
		});
	}

	exec(message, { user }) {
		const blacklist = this.client.settings.get('global', 'blacklist', []);
		if (blacklist.includes(user.id)) {
			const index = blacklist.indexOf(user.id);
			blacklist.splice(index, 1);
			if (blacklist.length === 0) this.client.settings.delete('global', 'blacklist');
			else this.client.settings.set('global', 'blacklist', blacklist);

			return message.util.send(`**${user.tag}** has been removed from the blacklist.`);
		}

		blacklist.push(user.id);
		this.client.settings.set('global', 'blacklist', blacklist);

		return message.util.send(`**${user.tag}** has been blacklisted.`);
	}
}

module.exports = BlacklistCommand;
