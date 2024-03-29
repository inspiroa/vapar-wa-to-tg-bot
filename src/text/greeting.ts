const debug = require("debug")("bot:greeting_text");

const replyToMessage = (ctx: any, messageId: string, string: string) =>
	ctx.reply(string, {
		reply_to_message_id: messageId,
	});

const greeting = () => (ctx: any) => {
	debug('Triggered "greeting" text command');

	const messageId = ctx.message.message_id;
	// const userName = ctx.from.last_name ? `${ctx.from.first_name} ${ctx.from.last_name}` : ctx.from.first_name;
	const messageText = ctx.message.text;

	// Regular expression to match and capture the desired parts
	const regex =
		/\[(?:\d{2}\.\d{2},\s\d{2}:\d{2})\]\s[^\:]+:\s(?:[^\n]+)\n((?:.|\n)+?)(?=\[\d{2}\.\d{2},\s\d{2}:\d{2}\]|$)/g;

	let result: string = "";
	let expensiveItems: string = "";
	let match: RegExpExecArray | null = null;

	while ((match = regex.exec(messageText)) !== null) {
		const item = match[1].trim();
		if (item.toLowerCase().endsWith(" дорого")) {
			expensiveItems += item.slice(0, -7).trim() + "; ";
		} else {
			result += item + "; ";
		}
	}

	// Remove the last semicolon and space, and send the result
	if (result) {
		replyToMessage(ctx, messageId, result);
	}
	if (expensiveItems) {
		setTimeout(() => {
			replyToMessage(ctx, messageId, "дорого");
		}, 300);

		setTimeout(() => {
			replyToMessage(ctx, messageId, expensiveItems);
		}, 500);
	}
};

export { greeting };
