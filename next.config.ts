import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /**
   * Stop `next dev` from writing into AGENTS.md.
   *
   * Next 16 appends a managed `nextjs-agent-rules` block to AGENTS.md (or
   * CLAUDE.md) the first time it detects an AI coding agent running the dev
   * server. It is upserted, so a later Next upgrade rewrites it, which lands an
   * AGENTS.md diff inside whatever unrelated branch happened to run `dev` first.
   *
   * AGENTS.md here is not a scratch file. It carries the FERPA rules and the
   * architecture rule, it is reviewed, and nothing should edit it but a person.
   *
   * The block's useful half — that Next 16 diverges from what a model has
   * memorised, and that version-exact docs are on disk in
   * `node_modules/next/dist/docs/` — is restated in our own words in the Stack
   * section of AGENTS.md, where we control the wording and can point at our own
   * rules. The half we are declining told agents to commit the block.
   *
   * Gate is at `node_modules/next/dist/server/lib/start-server.js` ("Gated on
   * `agentRules` in next.config (default true)"); the writer it guards is
   * `server/lib/generate-agent-files.js`.
   */
  agentRules: false,
}

export default nextConfig
