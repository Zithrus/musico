const { AkairoClient, CommandHandler, InhibitorHandler, ListenerHandler, Flag } = require('discord-akairo');
const { MessageEmbed, Util } = require('discord.js');
const { Client: Music } = require('lavaqueue');
const { Rejects } = require('rejects');
const path = require('path');

const Mongo = require('./Mongo');
const Playlist = require('./PLHandler');
const Tags = require('./TagHandler');
const Settings = require('../core/SettingsProvider');

class BotClient extends AkairoClient {
	constructor() {
		super({
			ownerID: ['539770184236269568']
		}, {
			messageCacheMaxSize: 50,
			messageCacheLifetime: 300,
			messageSweepInterval: 600,
			disableEveryone: true,
			fetchAllMembers: false
		});
		this.music = new Music({
			userID: process.env.ID,
			password: 'youshallnotpass',
			hosts: {
				rest: process.env.LAVALINK_REST,
				ws: process.env.LAVALINK_WS,
				redis: {
					port: process.env.REDIS_PORT,
					host: process.env.REDIS_HOST,
					password: process.env.REDIS_PASSWORD,
					db: 0
				}
			},
			send: async (guild, packet) => {
				const shardGuild = this.guilds.cache.get(guild);
				if (shardGuild) return shardGuild.shard.send(packet);
				return Promise.resolve();
			},
			advanceBy: (queue, { previous }) => {
				if (this.repeat.get(queue.guildID)) queue.add(previous);
			}
		});


		this.on('raw', async packet => {
			switch (packet.t) {
				case 'VOICE_STATE_UPDATE':
					if (packet.d.user_id !== process.env.ID) return;
					this.music.voiceStateUpdate(packet.d);
					break;
				case 'VOICE_SERVER_UPDATE':
					this.music.voiceServerUpdate(packet.d);
					break;
				default: break;
			}
		});

		this.commandHandler = new CommandHandler(this, {
			directory: path.join(__dirname, '..', 'commands'),
			prefix: message => {
				if (message.guild) return this.settings.get(message.guild.id, 'prefix', ';');
				return ';';
			},
			allowMention: true,
			commandUtil: true,
			commandUtilLifetime: 3e5,
			handleEdits: true,
			argumentDefaults: {
				prompt: {
					modifyStart: (_, txt) => new MessageEmbed()
						.setColor(0x5e17eb)
						.setDescription(txt)
						.setFooter('Type cancel to cancel the command.'),
					modifyRetry: (_, txt) => new MessageEmbed()
						.setColor(0x5e17eb)
						.setDescription(txt)
						.setFooter('Type cancel to cancel the command.'),
					timeout: 'Ran out of time.',
					ended: 'No more tries.',
					cancel: () => new MessageEmbed()
						.setColor('RED')
						.setAuthor('Cancelled'),
					retries: 3,
					time: 30000
				}
			}
		});

		this.commandHandler.resolver.addType('playlist', async (message, phrase) => {
			if (!phrase) { return Flag.fail(phrase); }
			phrase = Util.cleanContent(phrase.toLowerCase(), message);
			const playlist = await this.mongo.db('musico').collection('playlist').findOne({ name: phrase, guild: message.guild.id });
			return playlist || Flag.fail(phrase);
		});

		this.commandHandler.resolver.addType('existingPlaylist', async (message, phrase) => {
			if (!phrase) { return Flag.fail(phrase); }
			phrase = Util.cleanContent(phrase.toLowerCase(), message);
			const playlist = await this.mongo.db('musico').collection('playlist').findOne({ name: phrase, guild: message.guild.id });
			return playlist ? Flag.fail(phrase) : phrase;
		});

		this.commandHandler.resolver.addType('tag', async (message, phrase) => {
			if (!phrase) return null;
			phrase = Util.cleanContent(phrase.toLowerCase(), message);
			const tag = await this.mongo.db('musico').collection('tags').findOne({ name: phrase, guild: message.guild.id });

			return tag || null;
		});

		this.commandHandler.resolver.addType('existingTag', async (message, phrase) => {
			if (!phrase) return null;
			phrase = Util.cleanContent(phrase.toLowerCase(), message);
			const tag = await this.mongo.db('musico').collection('tags').findOne({
				guild: message.guild.id,
				name: phrase,
				aliases: phrase
			});

			return tag ? null : phrase;
		});

		this.commandHandler.resolver.addType('tagContent', (message, phrase) => {
			if (!phrase) phrase = '';
			phrase = Util.cleanContent(phrase, message);
			if (message.attachments.first()) phrase += `\n${message.attachments.first().url}`;

			return phrase || null;
		});
	}

	async init() {
		this.inhibitorHandler = new InhibitorHandler(this, { directory: path.join(__dirname, '..', 'inhibitors') });

		this.listenerHandler = new ListenerHandler(this, { directory: path.join(__dirname, '..', 'listeners') });

		this.commandHandler.useInhibitorHandler(this.inhibitorHandler);
		this.commandHandler.useListenerHandler(this.listenerHandler);

		this.listenerHandler.setEmitters({
			commandHandler: this.commandHandler,
			inhibitorHandler: this.inhibitorHandler,
			listenerHandler: this.listenerHandler
		});

		this.commandHandler.loadAll();
		this.inhibitorHandler.loadAll();
		this.listenerHandler.loadAll();

		this.stats = new Map();
		this.repeat = new Map();
		this.bass = new Map();
		this.volume = new Map();
		this.music.on('stats', stats => {
			this.stats.set('lavalink-stats', stats);
		});

		this.mongo = new Mongo();
		await this.mongo.connect();

		this.settings = new Settings(this.mongo.db('musico').collection('settings'));
		await this.settings.init();

		this.storage = new Rejects(this.music.queues.redis);
		this.playlist = new Playlist(this);
		this.tags = new Tags(this);
	}

	async start(token) {
		await this.init();
		return this.login(token);
	}
}

module.exports = BotClient;
