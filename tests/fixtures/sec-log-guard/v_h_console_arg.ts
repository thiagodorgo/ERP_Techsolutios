declare function startWorker(o: { logger?: Pick<Console, "error"> }): void;
startWorker({ logger: console });
