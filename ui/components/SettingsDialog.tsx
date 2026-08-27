import { Dialog, Transition } from "@headlessui/react";
import { CloudUpload, RefreshCcw } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

type ModelOption = {
  id: string;
  label: string;
  description?: string;
  provider: string;
};

interface SettingsType {
  models: ModelOption[];
  selectedModelId: string;
}

const SettingsDialog = ({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) => {
  const [config, setConfig] = useState<SettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedModel = useMemo(
    () => config?.models.find((m) => m.id === config.selectedModelId),
    [config]
  );

  useEffect(() => {
    if (!isOpen) return;

    const fetchConfig = async () => {
      setIsLoading(true);
      setError(null);
      setSaveError(null);

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/config`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? `Failed to load config (${res.status})`);
        }
        const data = (await res.json()) as SettingsType;
        setConfig(data);
      } catch (err: unknown) {
        console.error(err);
        setConfig(null);
        setError(
          err instanceof Error
            ? err.message
            : "Settings are unavailable. Configure the backend via environment variables."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!config || error) return;

    setIsUpdating(true);
    setSaveError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedModelId: config.selectedModelId,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Failed to save config (${res.status})`);
      }

      setIsOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      console.error(err);
      setSaveError(
        err instanceof Error ? err.message : "Failed to save settings."
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={() => setIsOpen(false)}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 scale-200"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform rounded-2xl border border-[#1c1c1c] bg-[#111111] p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title className="text-white text-xl font-medium leading-6">
                  Settings
                </Dialog.Title>

                {isLoading && (
                  <div className="w-full flex items-center justify-center mt-6 text-white/70 py-6">
                    <RefreshCcw className="animate-spin" />
                  </div>
                )}

                {error && !isLoading && (
                  <p className="text-white/70 text-sm mt-6">{error}</p>
                )}

                {config && !isLoading && !error && (
                  <div className="flex flex-col space-y-4 mt-6 pr-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-white/70 text-sm">Chat Model</p>
                      <select
                        value={config.selectedModelId}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            selectedModelId: e.target.value,
                          })
                        }
                        className="bg-[#111111] px-3 py-2 flex items-center overflow-hidden border border-[#1C1C1C] text-white rounded-lg text-sm"
                      >
                        {config.models.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.label}
                          </option>
                        ))}
                      </select>
                      {selectedModel?.description && (
                        <p className="text-white/50 text-xs mt-1">
                          {selectedModel.description}
                        </p>
                      )}
                      {selectedModel && (
                        <p className="text-white/40 text-xs">
                          Provider: {selectedModel.provider}
                        </p>
                      )}
                    </div>

                    <p className="text-white/50 text-xs">
                      API keys are configured via server environment variables.
                    </p>
                  </div>
                )}

                {saveError && (
                  <p className="text-red-400 text-sm mt-4">{saveError}</p>
                )}

                <div className="w-full mt-6 space-y-2">
                  {config && !error && (
                    <p className="text-xs text-white/50">
                      We&apos;ll refresh the page after updating settings.
                      Changes apply to new connections until server restart.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading || isUpdating || !config || !!error}
                    className="bg-[#24A0ED] flex flex-row items-center justify-center space-x-2 text-white disabled:text-white/50 hover:bg-opacity-85 transition duration-100 disabled:bg-[#ececec21] rounded-full px-4 py-2 text-sm font-medium"
                  >
                    {isUpdating ? (
                      <RefreshCcw size={18} className="animate-spin" />
                    ) : (
                      <CloudUpload size={18} />
                    )}
                    <span>Save settings</span>
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default SettingsDialog;