#!/usr/bin/env node
/**
 * farstone-serve — launch Farstone on @red-cup-engineering/fizzos's live MUD server.
 *
 *   PORT / FIZZOS_PORT — listen port (default 18820)
 *   HOST                — bind host    (default 127.0.0.1)
 *   FIZZOS_SAVE         — durable snapshot file (restored on boot, checkpointed)
 */
import process from "node:process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { type App, type Repr, htmlRepr, installGracefulShutdown, mergeApps, start } from "@red-cup-engineering/fizzos/http";
import { createFizzosMud } from "@red-cup-engineering/fizzos/mud-server";
import { CLIENT_HTML } from "@red-cup-engineering/fizzos/client";
import { checkpoint, fileStore } from "@red-cup-engineering/fizzos/persistence";
import type { SceneSnapshot } from "@red-cup-engineering/fizzos/scene";
import type { Bible } from "@red-cup-engineering/fizzos/world-load";
import { FARSTONE_GAME } from "./farstone-game.mjs";

const HARBOR_PATH = fileURLToPath(new URL("../docs/world/harbor.json", import.meta.url));
const harbor = JSON.parse(readFileSync(HARBOR_PATH, "utf8")) as Bible;

const port = Number(process.env["PORT"] ?? process.env["FIZZOS_PORT"] ?? 18820);
const host = process.env["HOST"] ?? "127.0.0.1";
const savePath = process.env["FIZZOS_SAVE"];

const store = savePath === undefined ? undefined : fileStore<SceneSnapshot>(savePath);
const restored = store?.load() ?? undefined;
const mud = createFizzosMud(harbor, { game: FARSTONE_GAME, ...(restored === null || restored === undefined ? {} : { snapshot: restored }) });

const clientApp: App = {
  resources: [{
    match: (path: string) => path === "/" || path === "/index.html",
    methods: ["GET"],
    produces: ["text/html"],
    handler: async (): Promise<Repr> => htmlRepr(CLIENT_HTML),
  }],
};
const app = mergeApps(clientApp, mud.app);

if (store !== undefined) {
  const checkpointer = checkpoint<SceneSnapshot>(() => mud.snapshot(), store, Number(process.env["FIZZOS_SAVE_MS"] ?? 30_000));
  process.on("exit", () => checkpointer.flush());
}

const result = await start(app, { port, host });
installGracefulShutdown(result);
mud.start();
process.stderr.write(`[farstone] live on http://${host}:${result.port}/${savePath ? `, durable to ${savePath}` : ""}\n`);
