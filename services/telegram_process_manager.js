class ProcessManager {
    constructor(bot) {
        this.bot = bot;
        this.sessions = {}; // Object to store user sessions and process steps
    }

    // Initialize process for a user
    startProcess(userId, steps) {
        this.sessions[userId] = {
            currentStep: 0,
            steps: steps,
            data: {}
        };
    }

    // Function to move to the next step
    async nextStep(userId, ctx) {
        const session = this.sessions[userId];

        if (!session) {
            return this.bot.telegram.sendMessage(ctx.from.id, 'Proses belum dimulai. Gunakan perintah /start untuk memulai.');
        }

        const stepIndex = session.currentStep;
        const step = session.steps[stepIndex];

        if (!step) {
            delete this.sessions[userId]; // Clear session if no more steps
            return this.bot.telegram.sendMessage(ctx.from.id, 'Proses selesai. Terima kasih!');
        }

        // Validate input only if the step is required
        const isValid = step.required 
            ? (step.validate ? await step.validate(ctx) : true) 
            : true; // Skip validation if not required

        // If the step is required and input is invalid, re-prompt
        if (step.required && !isValid) {
            return this.bot.telegram.sendMessage(ctx.from.id, step.prompt, step.markup_reply); // Re-prompt for valid input
        }

        // Store the result in the session data
        session.data[step.name] = ctx.message;

        // Move to the next step
        session.currentStep++;

        // Ask for the next input or complete process if finished
        if (session.currentStep < session.steps.length) {
            const nextStep = session.steps[session.currentStep];
            return this.bot.telegram.sendMessage(ctx.from.id, nextStep.prompt, nextStep.markup_reply); // Prompt the next input
        } else {
            // If no more steps, process the result and end session
            if (step.onComplete) {
                await step.onComplete(ctx, session.data);
            }
            delete this.sessions[userId];
        }
    }
}

module.exports = ProcessManager;
