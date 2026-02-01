import { AppConfig } from '../types';

export interface RegexScript {
    id: string;
    scriptName: string;
    findRegex: string;
    replaceString: string;
    placement: number[];
    disabled?: boolean;
    markdownOnly?: boolean;
    promptOnly?: boolean;
}

// Regex Placement Enums (Matching Backend)
export enum RegexPlacement {
    MD_DISPLAY = 0,
    USER_INPUT = 1,
    AI_OUTPUT = 2,
    SLASH_COMMAND = 3,
    WORLD_INFO = 5,
    REASONING = 6
}

export class RegexDisplayService {
    private scripts: RegexScript[] = [];
    private appConfig: AppConfig;
    private hasLoaded: boolean = false;

    constructor(appConfig: AppConfig) {
        this.appConfig = appConfig;
    }

    /**
     * Fetch scripts from Backend API
     */
    async loadScripts() {
        try {
            const { port, token } = this.appConfig;
            const baseUrl = `http://127.0.0.1:${port}`;
            // Placement 0-6 allow all, but we specifically care about display-relevant ones.
            // Filter is handled in processText mostly, or we can ask backend for all.
            // Let's ask for all to cache them.
            const url = `${baseUrl}/api/settings/regex/scripts`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': token || ''
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.scripts = data.scripts || [];
                this.hasLoaded = true;
                console.log(`[RegexDisplayService] Loaded ${this.scripts.length} scripts.`);
            } else {
                console.error('[RegexDisplayService] Failed to load scripts:', response.statusText);
            }
        } catch (e) {
            console.error('[RegexDisplayService] Error loading scripts:', e);
        }
    }

    /**
     * Apply display regexes to the text
     * @param text Original text
     * @param overrides Optional map of scriptName -> isEnabled from frontend toggles
     * @returns Processed text
     */
    processText(text: string, overrides?: Record<string, boolean>): string {
        if (!text || !this.hasLoaded) return text;

        let processed = text;

        for (const script of this.scripts) {
            // Priority: overrides > script.disabled > default enabled
            // overrides map contains: scriptName -> isEnabled (true = enabled)
            const scriptName = script.scriptName;
            let isDisabled = script.disabled ?? false;

            if (overrides && scriptName && scriptName in overrides) {
                // Frontend sends isEnabled, so invert to get isDisabled
                isDisabled = !overrides[scriptName];
            }

            if (isDisabled) continue;

            // Check placement: We are doing "Display" processing.
            // In JS frontend, we usually care if:
            // 1. It is a dedicated Display script (markdownOnly = true usually implies display)
            // 2. Or placement includes MD_DISPLAY (0) ?? ST code uses 'isMarkdown' flag passed to getRegexedString.
            // If we are strictly doing "Markdown/Display" processing here for the UI:
            // We should apply if script.markdownOnly is true OR if it's meant for output processing that serves display?
            // Actually ST logic: if (script.markdownOnly && !isMarkdown) return false;
            // So if isMarkdown is true (which it is here), we apply unless input-only?
            // Let's stick to: Apply if (markdownOnly) OR (placement includes AI_OUTPUT for received msg?) via logic?

            // Simpler approach for now:
            // Since backend already processed Prompt regexes (USER_INPUT), we don't apply those here to "User Message" display 
            // unless we want to show the 'cleaned' version? Usually user wants to see what they typed.
            // So for User Messages in UI -> Apply nothing or only 'MD_DISPLAY'?

            // Let's assume this function is called for AI Messages specifically? 
            // Or we pass a context/role?

            // For now, let's blindly apply scripts that have `markdownOnly: true` 
            // OR correspond to AI_OUTPUT if we assume text is AI output?
            // To be safe and mimic ST "Display" mode:
            // We apply logic similar to `getRegexedString(..., isMarkdown=true)`

            // If `promptOnly` is true, we SKIP (since this is display).
            if (script.promptOnly) continue;

            // If `markdownOnly` is true, we APPLY. (Display specific)
            // If neither, it's general... check placement?

            // For simplicity in this `localapp`, let's just apply `markdownOnly` scripts 
            // and maybe `AI_OUTPUT` ones if we consider this render pipeline part of output?
            // Let's stick to logic: If (markdownOnly) -> Apply. 
            // If (AI_OUTPUT) -> Apply? (Previously ST backend applies AI_OUTPUT regex to the text stored in history? No)
            // ST applies AI_OUTPUT usually to the received chunk?

            // Let's start conservative: Apply all scripts where `markdownOnly == true`.
            // And also scripts where placement includes AI_OUTPUT if this is AI text?
            // But we don't know text source here purely.
            // Let's simply apply everything that is NOT `promptOnly` and NOT `disabled`.
            // (This might be too aggressive, but ST `isMarkdown=true` is aggressive).

            // 3. Compile Regex
            try {
                let patternStr = script.findRegex;
                let flags = 'gm'; // Default ST flags

                // Parse /pattern/flags
                if (patternStr.startsWith('/') && patternStr.lastIndexOf('/') > 0) {
                    const lastSlash = patternStr.lastIndexOf('/');
                    flags = patternStr.substring(lastSlash + 1);
                    patternStr = patternStr.substring(1, lastSlash);
                }

                const regex = new RegExp(patternStr, flags);

                // 4. Replace
                // ST `replaceString` uses $1 $2 which JS replace supports naturally.
                // But if replaceString is not a function, we pass it directly.

                processed = processed.replace(regex, script.replaceString || '');

            } catch (err) {
                console.warn(`[Regex] Script ${script.scriptName} failed:`, err);
            }
        }

        return processed;
    }
}
