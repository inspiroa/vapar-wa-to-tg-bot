import { VercelRequest, VercelResponse } from "@vercel/node";
import Telegraf, { Context as TelegrafContext, Extra } from "telegraf";
import { ExtraReplyMessage } from "telegraf/typings/telegram-types";
import { about, greeting } from "..";
import { ok } from "./responses";

const welcomeMessage =
	"Короче, Вапарыш, я тебя спас и в благородство играть не буду: присылаешь для меня несколько сообщений из вацап – и мы в расчете. Заодно напишем пригодную для отчета конверсию. Хрен его знает, на кой ляд тебе этот Отчет сдался, но я в чужие дела не лезу, хочешь написать, значит есть за что…";
const instructions =
	'Вот что тебе нужно сделать: \n\n1. Заходишь в чат Конверсии \n2. Выделяешь все сообщения за день: Нажимаешь на первое, затем прокручиваешь вниз, пока не выделишь все, что нужно. \n3. Нажимаешь на кнопку "Скопировать" \n4. Отправляешь все это мне. \n5. Я пережёвываю эти сообщения и превращаю их в то, что тебе нужно для отчёта. \n6. Ты получаешь готовый отчёт и можешь спать спокойно. \n\n Всё, до связи...';
const debug = require("debug")("lib:telegram");

const isDev = process.env.DEV;

const VERCEL_URL = process.env.VERCEL_URL;

const BOT_TOKEN = process.env.BOT_TOKEN;

export const bot = new Telegraf(BOT_TOKEN);

function botUtils() {
	bot.use(Telegraf.log());
	bot.use(logger);

	bot.start(ctx => {
		ctx.reply(welcomeMessage);

		setTimeout(() => {
			ctx.reply(instructions);
		}, 500);
	});

	bot.command("about", about()).on("text", greeting());
}

async function localBot() {
	debug("Bot is running in development mode at http://localhost:3000");

	bot.webhookReply = true;

	const botInfo = await bot.telegram.getMe();
	bot.options.username = botInfo.username;

	console.info("Server has initialized bot username: ", botInfo.username);

	debug(`deleting webhook`);
	await bot.telegram.deleteWebhook();

	debug(`starting polling`);
	await bot.launch();
}

export async function useWebhook(req: VercelRequest, res: VercelResponse) {
	try {
		if (!isDev && !VERCEL_URL) {
			throw new Error("VERCEL_URL is not set.");
		}

		const getWebhookInfo = await bot.telegram.getWebhookInfo();

		const botInfo = await bot.telegram.getMe();
		bot.options.username = botInfo.username;
		console.info("Server has initialized bot username using Webhook. ", botInfo.username);

		if (getWebhookInfo.url !== VERCEL_URL + "/api") {
			debug(`deleting webhook`);
			await bot.telegram.deleteWebhook();
			debug(`setting webhook to ${VERCEL_URL}/api`);
			await bot.telegram.setWebhook(`${VERCEL_URL}/api`);
		}

		// call bot commands and middlware
		botUtils();

		// console.log("webhook already defined");
		// console.log("request method: ", req.method);
		// console.log("req.body", req.body);

		if (req.method === "POST") {
			await bot.handleUpdate(req.body, res);
		} else {
			ok(res, "Listening to bot events...");
		}
	} catch (error) {
		console.error(error);
		return error.message;
	}
}

export function toArgs(ctx: TelegrafContext) {
	const regex = /^\/([^@\s]+)@?(?:(\S+)|)\s?([\s\S]+)?$/i;
	const parts = regex.exec(ctx.message!.text!.trim());
	if (!parts) {
		return [];
	}
	return !parts[3] ? [] : parts[3].split(/\s+/).filter(arg => arg.length);
}

export const MARKDOWN = Extra.markdown(true) as ExtraReplyMessage;

export const NO_PREVIEW = Extra.markdown(true).webPreview(false) as ExtraReplyMessage;

export const hiddenCharacter = "\u200b";

export const logger = async (_: TelegrafContext, next): Promise<void> => {
	const start = new Date();
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	await next();
	const ms = new Date().getTime() - start.getTime();
	console.log("Response  time: %sms", ms);
};

if (isDev) {
	console.log("isDev", isDev);

	localBot().then(() => {
		// call bot commands and middlware
		botUtils();

		// launch bot
		bot.launch();
	});
}
