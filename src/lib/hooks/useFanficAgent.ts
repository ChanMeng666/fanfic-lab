"use client";

import { useCoAgent, useCoAgentStateRender } from "@copilotkit/react-core";
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { useCallback, useMemo } from "react";
import type {
  FanficAgentState,
  StoryContext,
  StoryCharacter,
  OOCCheckResult,
  GeneratedImage,
  PendingContent,
  WizardSession,
} from "@/lib/types/agent-state";
import { INITIAL_AGENT_STATE, INITIAL_WIZARD_SESSION } from "@/lib/types/agent-state";

// Default story context
const DEFAULT_STORY_CONTEXT: StoryContext = {
  fandom: "",
  ships: [],
  tags: [],
  plotPoints: [],
  currentChapter: 1,
  characters: [],
  tone: "neutral",
};

// Default wizard session - use the one from agent-state
const DEFAULT_WIZARD_SESSION: WizardSession = INITIAL_WIZARD_SESSION;

interface UseFanficAgentOptions {
  storyContext?: Partial<StoryContext>;
  editorContent?: string;
  onContentApproval?: (content: PendingContent, approved: boolean) => void;
  onOOCResults?: (results: OOCCheckResult[]) => void;
  onImageGenerated?: (image: GeneratedImage) => void;
}

/**
 * Main hook for interacting with the FanFic Lab AI agent
 * Provides state management, context sharing, and action handling
 */
export function useFanficAgent(options: UseFanficAgentOptions = {}) {
  // Connect to the LangGraph agent
  const {
    state,
    setState,
    running,
    start,
    stop,
  } = useCoAgent<FanficAgentState>({
    name: "fanfic_agent",
    initialState: {
      ...INITIAL_AGENT_STATE,
      storyContext: {
        ...DEFAULT_STORY_CONTEXT,
        ...options.storyContext,
      },
      editorContent: options.editorContent || "",
    },
  });

  // Get story context with fallback
  const storyContext = state.storyContext || DEFAULT_STORY_CONTEXT;
  const wizardSession = state.wizardSession || DEFAULT_WIZARD_SESSION;

  // Render agent state updates
  useCoAgentStateRender({
    name: "fanfic_agent",
    render: ({ state }) => {
      // Handle state updates from the agent
      if (state.oocCheckResults?.length && options.onOOCResults) {
        options.onOOCResults(state.oocCheckResults);
      }
      if (state.generatedImages?.length && options.onImageGenerated) {
        const latestImage = state.generatedImages[state.generatedImages.length - 1];
        options.onImageGenerated(latestImage);
      }
      return null;
    },
  });

  // Share story context with the AI
  useCopilotReadable({
    description: "Current story context including fandom, characters, and tone",
    value: storyContext,
  });

  // Share editor content with the AI
  useCopilotReadable({
    description: "Current editor content being written",
    value: state.editorContent,
  });

  // Action to approve/reject AI-generated content
  useCopilotAction({
    name: "approve_content",
    description: "Approve or reject AI-generated content",
    parameters: [
      {
        name: "approved",
        type: "boolean",
        description: "Whether the content is approved",
      },
    ],
    handler: ({ approved }) => {
      if (state.pendingContent && options.onContentApproval) {
        options.onContentApproval(state.pendingContent, approved);
      }
      setState({
        ...state,
        pendingContent: null,
      });
    },
  });

  // Update story context
  const updateStoryContext = useCallback(
    (updates: Partial<StoryContext>) => {
      setState({
        ...state,
        storyContext: {
          ...storyContext,
          ...updates,
        },
      });
    },
    [state, setState, storyContext]
  );

  // Update editor content
  const updateEditorContent = useCallback(
    (content: string) => {
      setState({
        ...state,
        editorContent: content,
      });
    },
    [state, setState]
  );

  // Add a character to the story
  const addCharacter = useCallback(
    (character: StoryCharacter) => {
      const existingCharacters = storyContext.characters || [];
      if (existingCharacters.some((c) => c.id === character.id)) {
        return; // Already exists
      }
      setState({
        ...state,
        storyContext: {
          ...storyContext,
          characters: [...existingCharacters, character],
        },
      });
    },
    [state, setState, storyContext]
  );

  // Remove a character from the story
  const removeCharacter = useCallback(
    (characterId: string) => {
      setState({
        ...state,
        storyContext: {
          ...storyContext,
          characters: (storyContext.characters || []).filter(
            (c) => c.id !== characterId
          ),
        },
      });
    },
    [state, setState, storyContext]
  );

  // Set pending content for approval
  const setPendingContent = useCallback(
    (content: PendingContent | null) => {
      setState({
        ...state,
        pendingContent: content,
      });
    },
    [state, setState]
  );

  // Clear OOC results
  const clearOOCResults = useCallback(() => {
    setState({
      ...state,
      oocCheckResults: [],
    });
  }, [state, setState]);

  // Get characters for the current fandom
  const fandomCharacters = useMemo(() => {
    return (storyContext.characters || []).filter(
      (c) => c.fandom.toLowerCase() === storyContext.fandom?.toLowerCase()
    );
  }, [storyContext.characters, storyContext.fandom]);

  return {
    // State
    state,
    storyContext,
    editorContent: state.editorContent,
    pendingContent: state.pendingContent,
    oocCheckResults: state.oocCheckResults || [],
    generatedImages: state.generatedImages || [],
    wizardSession,

    // Agent status
    isRunning: running,

    // Agent controls
    start,
    stop,

    // State updaters
    setState,
    updateStoryContext,
    updateEditorContent,
    addCharacter,
    removeCharacter,
    setPendingContent,
    clearOOCResults,

    // Computed values
    fandomCharacters,
  };
}

/**
 * Hook for wizard-specific agent interactions
 */
export function useWizardAgent() {
  const {
    state,
    setState,
    storyContext,
    wizardSession,
    updateStoryContext,
    addCharacter,
  } = useFanficAgent();

  const updateWizardStep = useCallback(
    (step: WizardSession["step"]) => {
      setState({
        ...state,
        wizardSession: {
          ...wizardSession,
          step,
        },
      });
    },
    [state, setState, wizardSession]
  );

  const setWizardSource = useCallback(
    (sourceName: string, sourceType: WizardSession["sourceType"]) => {
      setState({
        ...state,
        wizardSession: {
          ...wizardSession,
          sourceName,
          sourceType,
          step: "config",
        },
        storyContext: {
          ...storyContext,
          fandom: sourceName,
        },
      });
    },
    [state, setState, wizardSession, storyContext]
  );

  const setWizardConfig = useCallback(
    (shipType: WizardSession["shipType"], setting: WizardSession["setting"], additionalTags: string[]) => {
      setState({
        ...state,
        wizardSession: {
          ...wizardSession,
          shipType,
          setting,
          additionalTags,
          step: "research",
        },
        storyContext: {
          ...storyContext,
          ships: shipType ? [shipType] : [],
          tags: additionalTags,
        },
      });
    },
    [state, setState, wizardSession, storyContext]
  );

  const addWizardCharacter = useCallback(
    (character: StoryCharacter) => {
      addCharacter(character);
      setState({
        ...state,
        wizardSession: {
          ...wizardSession,
          characters: [...wizardSession.characters, character],
        },
      });
    },
    [state, setState, wizardSession, addCharacter]
  );

  const completeWizard = useCallback(() => {
    setState({
      ...state,
      wizardSession: {
        ...wizardSession,
        step: "complete",
      },
    });
  }, [state, setState, wizardSession]);

  return {
    wizardSession,
    storyContext,
    updateWizardStep,
    setWizardSource,
    setWizardConfig,
    addWizardCharacter,
    completeWizard,
    updateStoryContext,
  };
}

/**
 * Hook for editor-specific agent interactions
 */
export function useEditorAgent(initialContent: string = "") {
  const agent = useFanficAgent({
    editorContent: initialContent,
  });

  // Request AI continuation
  const requestContinuation = useCallback(
    async (_targetLength: "short" | "medium" | "long" = "medium") => {
      agent.start();
      // The agent will handle the continuation via the continueStory tool
    },
    [agent]
  );

  // Request scene expansion
  const requestExpansion = useCallback(
    async (
      _selectedText: string,
      _focusArea: "dialogue" | "description" | "emotion" | "action" | "atmosphere" | "general"
    ) => {
      agent.start();
    },
    [agent]
  );

  // Request prose polish
  const requestPolish = useCallback(
    async (_selectedText: string, _intensity: "light" | "medium" | "heavy") => {
      agent.start();
    },
    [agent]
  );

  // Request OOC check
  const requestOOCCheck = useCallback(async () => {
    agent.start();
    // The agent will handle the OOC check via the checkOOC tool
  }, [agent]);

  return {
    ...agent,
    requestContinuation,
    requestExpansion,
    requestPolish,
    requestOOCCheck,
  };
}
