const restify = require('restify');
const path = require('path');
const { BotFrameworkAdapter , ConversationState , MemoryStorage , UserState } = require('botbuilder');
const{ BotConfiguration } = require('botframework-config');
const{ MultiTurnBot } = require('./bot');
const ENV_FILE = path.join(__dirname,'.env');//to take path of .env file in your directory
require('dotenv').config({ path : ENV_FILE });
//create HTTP server
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function(){
    console.log(`\n ${'server.name'} listening to ${'server.url'}`);
    console.log(`\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator.`);
    console.log(`\nTo talk to your bot, open multi-turn-prompt.bot file in the emulator.`);

});
// .bot file path
const BOT_FILE = path.join(__dirname, (process.env.botFilePath || ''));
let botConfig;
try {
    //Sync loading routine for a small comma-separated values file (.csv). Returns an array of objects, takes property names from the first line. Assumes everything is a string in quotes.
    botConfig = BotConfiguration.loadSync(BOT_FILE, process.env.botFileSecret);
} catch(err) {
    console.error(`\nError reading bot file. Please ensure you have valid botFilePath and botFileSecret set for your environment.`);
    console.error(`\n - The botFileSecret is available under appsettings for your Azure Bot Service bot.`);
    console.error(`\n - If you are running this bot locally, consider adding a .env file with botFilePath and botFileSecret.\n\n`);
    process.exit();
}
const DEV_ENVIRONMENT = 'development';
const BOT_CONFIGURATION = (process.env.NODE_ENV || DEV_ENVIRONMENT);
const adapter = new BotFrameworkAdapter({
    appId: "",
    appPassword: ""
});
// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    console.error(`\n [onTurnError]: ${ error }`);
    // Send a message to the user
    await context.sendActivity(`Oops. Something went wrong!`);
    // Clear out state
    await conversationState.delete(context);
};
const memoryStorage = new MemoryStorage();
// Create conversation state with in-memory storage provider.
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);
// Create the main dialog, which serves as the bot's main handler.

const bot = new MultiTurnBot(conversationState, userState);
// Listen for incoming requests.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (turnContext) => {
        // Route the message to the bot's main handler.
        await bot.onTurn(turnContext);
    });
});
