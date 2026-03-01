/**
 * Sample configuration data representing a Video Module hierarchy.
 * This structure will later be imported from Excel → JSON → Database.
 */
export interface RawOption {
  id: number;
  key: string;
  name: string;
  editable: boolean;
  included: boolean;
}

export interface RawRule {
  option_key: string;
  requires: string[];
}

export interface RawState {
  [event: string]: string;
}

export interface RawGroup {
  id: number;
  name: string;
  options: RawOption[];
}

export interface RawModule {
  id: string;
  name: string;
  initial: string;
  groups: RawGroup[];
  rules: RawRule[];
  states: Record<string, RawState>;
}

export interface RawConfig {
  modules: RawModule[];
}

export const SAMPLE_CONFIG: RawConfig = {
  modules: [
    {
      id: "video_module",
      name: "Video Module",
      initial: "idle",
      groups: [
        {
          id: 10,
          name: "Decoder Settings",
          options: [
            { id: 100, key: "h264", name: "H.264", editable: true, included: true },
            { id: 101, key: "vp9", name: "VP9", editable: false, included: false },
          ],
        },
        {
          id: 20,
          name: "Output Settings",
          options: [
            { id: 200, key: "4k_output", name: "4K Output", editable: true, included: true },
            { id: 201, key: "hdr", name: "HDR", editable: true, included: false },
            { id: 202, key: "sdr", name: "SDR", editable: false, included: true },
          ],
        },
      ],
      rules: [
        { option_key: "hdr", requires: ["4k_output"] },
        { option_key: "vp9", requires: ["h264"] },
      ],
      states: {
        idle: { ENABLE_4K: "4k_enabled" },
        "4k_enabled": { DISABLE_4K: "idle", ENABLE_HDR: "hdr_active" },
        hdr_active: { DISABLE_HDR: "4k_enabled" },
      },
    },
    {
      id: "audio_module",
      name: "Audio Module",
      initial: "idle",
      groups: [
        {
          id: 30,
          name: "Codec Settings",
          options: [
            { id: 300, key: "aac", name: "AAC", editable: true, included: true },
            { id: 301, key: "opus", name: "Opus", editable: true, included: false },
          ],
        },
      ],
      rules: [],
      states: {
        idle: { ENABLE_SURROUND: "surround_active" },
        surround_active: { DISABLE_SURROUND: "idle" },
      },
    },
  ],
};
