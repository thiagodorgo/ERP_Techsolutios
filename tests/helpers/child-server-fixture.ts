const mode = process.argv[2];

if (mode === "ready") process.stdout.write("PORT 43123\n");
setInterval(() => undefined, 1_000);
