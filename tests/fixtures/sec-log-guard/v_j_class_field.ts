export class W { private readonly logger: Pick<Console, "error"> = console; run(e: unknown) { this.logger.error({ e }); } }
