const { ActivityTypes } = require('botbuilder');
const { ChoicePrompt, DialogSet, NumberPrompt, DateTimePrompt, TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');
const DIALOG_STATE_PROPERTY = 'dialogState';
const USER_PROFILE_PROPERTY = 'user';
const WHO_ARE_YOU = 'who are you';
const HELLO_USER = 'hello_user';
const NAME_PROMPT = 'name_prompt';
const CONFIRM_PROMPT = 'confirm_prompt';
const AGE_PROMPT ='age_prompt';
const DATE_OF_BIRTH ='date_of_birth';

class MultiTurnBot{
    /**
     *
     * @param {ConversationState} conversationState A ConversationState object used to store the dialog state.
     * @param {UserState} userState A UserState object used to store values specific to the user.
     */
    constructor(conversationState, userState){
        this.conversationState = conversationState;
        this.userState = userState;
        this.DialogState = this.conversationState.createProperty(DIALOG_STATE_PROPERTY);
        this.userProfile = this.userState.createProperty(USER_PROFILE_PROPERTY);
        this.dialogs = new DialogSet(this.DialogState);

        // Add prompts that will be used by the main dialogs.
        this.dialogs.add(new TextPrompt(NAME_PROMPT));
        this.dialogs.add(new ChoicePrompt(CONFIRM_PROMPT));
        this.dialogs.add(new NumberPrompt(AGE_PROMPT));
        this.dialogs.add(new DateTimePrompt(DATE_OF_BIRTH));

        // Create a dialog that asks the user for their name.
        this.dialogs.add( new WaterfallDialog(WHO_ARE_YOU,[
            this.promptForName.bind(this),
            this.confirmAgePrompt.bind(this),
            this.promptforAge.bind(this),
            this.captureAge.bind(this),
            this.checkyear.bind(this),
            this.displayyear.bind(this)
        ]));
        // Create a dialog that displays a user name after it has been collected.
        this.dialogs.add(new WaterfallDialog(HELLO_USER,[
            this.displayProfile.bind(this)
        ]));


    }   
    
    async promptForName(step){

        return await step.prompt(NAME_PROMPT, `what is your name ?`);
        
    }
 // This step captures the user's name, then prompts whether or not to collect an age.
    async confirmAgePrompt(step){
        
        const user = await this.userProfile.get(step.context, {});
        console.log(user);
        
        user.name = step.result;
        await this.userProfile.set(step.context, user);
        await step.prompt(CONFIRM_PROMPT, 'Do you want to give your age?', ['yes', 'no']);

    } 
    async promptforAge(step){

        if(step.result && step.result.value ==='yes'){
            return await step.prompt(AGE_PROMPT,`what is your age ? `)
        }
    }

    async captureAge(step) {
        const user = await this.userProfile.get(step.context, {});
        if (step.result !== -1) {
            user.age = step.result;
            if (user.age > 0){
                await this.userProfile.set(step.context, user);
                await step.context.sendActivity(`I will remember that you are ${ step.result } years old.`);
            }
            else {

            if(user.age < 0) {
                await step.context.sendActivity(`Age can't be negative.`);
                user.age = null
                }
            }
            
        } else {
            await step.context.sendActivity(`No age given.`);
        }
        
    }
    async checkyear(step) {
       // const user = await this.userProfile.get(step.context, {});
        //user.age= step.result;
        //await this.userProfile.set(step.context, user);
        return await step.prompt(DATE_OF_BIRTH, `what is your Date of Birth ?`);
        }
    async displayyear(step) {
        if (step.result !== -1){
            const user = await this.userProfile.get(step.context, {});
            user.dob =step.result.date;
            await this.userProfile.set(step.context, user);
            await step.context.sendActivity(`I will remember that you were born on ${ step.result }.`);

        }
        return await step.endDialog();
        }
     

    async displayProfile(step) {
        const user = await this.userProfile.get(step.context, {});
        if (user.age) {
            await step.context.sendActivity(`Your name is ${ user.name } ,you are ${ user.age } years old and you born on ${ user.dob}.`);
        } else {
            await step.context.sendActivity(`Your name is ${ user.name } ,you did not share your age and you were born on ${ user.dob }.`);
        }
        return await step.endDialog();
    }
    async onTurn(turnContext) {
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        if (turnContext.activity.type === ActivityTypes.Message) {
            // Create a dialog context object.
            const dc = await this.dialogs.createContext(turnContext);

            const utterance = (turnContext.activity.text || '').trim().toLowerCase();
            if (utterance === 'cancel') {
                if (dc.activeDialog) {
                    await dc.cancelAllDialogs();
                    await dc.context.sendActivity(`Ok... canceled.`);
                } else {
                    await dc.context.sendActivity(`Nothing to cancel.`);
                }
            }

            // If the bot has not yet responded, continue processing the current dialog.
            await dc.continueDialog();

            // Start the sample dialog in response to any other input.
            if (!turnContext.responded) {
                const user = await this.userProfile.get(dc.context, {});
                if (user.name) {
                    await dc.beginDialog(HELLO_USER);
                } else {
                    await dc.beginDialog(WHO_ARE_YOU);
                }
            }
        } else if (turnContext.activity.type === ActivityTypes.ConversationUpdate) {
            // Do we have any new members added to the conversation?
            if (turnContext.activity.membersAdded.length !== 0) {
                // Iterate over all new members added to the conversation
                for (var idx in turnContext.activity.membersAdded) {
                    // Greet anyone that was not the target (recipient) of this message.
                    // Since the bot is the recipient for events from the channel,
                    // context.activity.membersAdded === context.activity.recipient.Id indicates the
                    // bot was added to the conversation, and the opposite indicates this is a user.
                    if (turnContext.activity.membersAdded[idx].id !== turnContext.activity.recipient.id) {
                        // Send a "this is what the bot does" message.
                        const description = [
                            'I am a bot that demonstrates the TextPrompt and NumberPrompt classes',
                            'to collect your name and age, then store those values in UserState for later use.',
                            'Say anything to continue.'
                        ];
                        await turnContext.sendActivity(description.join(' '));
                    }
                }
            }
        }

        // Save changes to the user state.
        await this.userState.saveChanges(turnContext);

        // End this turn by saving changes to the conversation state.
        await this.conversationState.saveChanges(turnContext);
    }
}

module.exports.MultiTurnBot = MultiTurnBot;
