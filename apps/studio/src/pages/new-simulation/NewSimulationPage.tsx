import { useEffect, useRef, useState } from "react";
import { StudioHeader } from "@/shared/ui/studio-header";
import { useSimulationDraft } from "@/pages/new-simulation/model/useSimulationDraft";
import { hasSeenIntroduction, rememberIntroduction } from "@/pages/new-simulation/model/introduction";
import { ParticipantsStep } from "@/pages/new-simulation/ui/ParticipantsStep";
import { ConfigurationSummary } from "@/pages/new-simulation/ui/ConfigurationSummary";
import { SimulationIntroduction } from "@/pages/new-simulation/ui/SimulationIntroduction";
import { SetupActions } from "@/pages/new-simulation/ui/SetupActions";
import { SetupSteps } from "@/pages/new-simulation/ui/SetupSteps";
import { TargetStep } from "@/pages/new-simulation/ui/TargetStep";
import { useProject } from "@/pages/new-simulation/model/useProject";
import { useSaveSimulation } from "@/pages/new-simulation/model/useSaveSimulation";
import { ExecutionLimits } from "@/pages/new-simulation/ui/ExecutionLimits";
import { SavedSimulation } from "@/pages/new-simulation/ui/SavedSimulation";

export function NewSimulationPage() {
  const setup = useSimulationDraft();
  const context = useProject();
  const persistence = useSaveSimulation();
  const suggestName = setup.suggestName;
  const suggestUrl = setup.suggestUrl;
  useEffect(() => { if (context.project) suggestName(context.project.suggestedName); }, [context.project, suggestName]);
  useEffect(() => { if (context.project?.targetSuggestion) suggestUrl(context.project.targetSuggestion.url); }, [context.project, suggestUrl]);
  const [introduction, setIntroduction] = useState<"first-visit" | "help" | null>(() => hasSeenIntroduction() ? null : "first-visit");
  const formRef = useRef<HTMLFormElement>(null);

  function advance() {
    if (!setup.advance()) {
      requestAnimationFrame(() => {
        const invalid = formRef.current?.querySelector<HTMLElement>(
          '[aria-invalid="true"], [role="alert"][tabindex]',
        );
        invalid?.focus();
      });
    } else if (setup.step === "summary" && context.project) {
      void persistence.save(setup.draft);
    }
  }

  return (
    <div className="min-h-dvh bg-canvas text-foreground">
      <a href="#configuration" className="sr-only bg-surface px-4 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-(--layer-overlay)">
        Skip to configuration
      </a>
      <StudioHeader />
      {introduction ? (
        <SimulationIntroduction returning={introduction === "help"} onContinue={() => {
          rememberIntroduction();
          setIntroduction(null);
          requestAnimationFrame(() => formRef.current?.focus());
        }} />
      ) : (
        <>
          <SetupSteps active={setup.step} onSelect={setup.setStep} onHelp={() => setIntroduction("help")} />
          <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
            <h1 className="sr-only">New simulation</h1>
              {persistence.saved ? <SavedSimulation configuration={persistence.saved} /> : <form
                id="configuration"
                ref={formRef}
                tabIndex={-1}
                aria-label="Simulation configuration"
                noValidate
                className="min-w-0"
                onSubmit={(event) => { event.preventDefault(); advance(); }}
              >
                <div className="mb-6 text-xs text-muted" aria-live="polite">
                  {context.project ? <p>Project <span className="ml-2 break-all font-mono">{context.project.rootPath}</span></p> : context.error ?
                    <p role="alert">{context.error} <button type="button" onClick={context.retry} className="ml-2 text-accent underline">Retry</button></p> : "Recognizing project…"}
                </div>
                <fieldset disabled={persistence.saving} className="min-w-0">
                {setup.step === "target" && (
                  <TargetStep draft={setup.draft} errors={setup.errors} onChange={setup.updateTarget} suggestion={context.project?.targetSuggestion} />
                )}
                {setup.step === "participants" && (
                  <ParticipantsStep
                    participants={setup.draft.participants}
                    errors={setup.errors}
                    onToggle={setup.toggleParticipant}
                  />
                )}
                {setup.step === "summary" && <>
                  <ConfigurationSummary draft={setup.draft} />
                  <ExecutionLimits {...(setup.draft.limits ? { value: setup.draft.limits } : {})} onChange={limits => setup.updateTarget({ limits })} />
                </>}
                {persistence.error && <p role="alert" className="mt-5 text-sm text-danger-text">{persistence.error}</p>}
                <SetupActions
                  step={setup.step}
                  saving={persistence.saving}
                  canSave={Boolean(context.project)}
                  onBack={() => setup.setStep(setup.step === "summary" ? "participants" : "target")}
                />
                </fieldset>
              </form>}
          </main>
        </>
      )}
    </div>
  );
}
