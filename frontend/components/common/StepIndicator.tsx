import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: string;
  onStepClick?: (step: string) => void;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div>
      {/* Desktop - Horizontal */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = step.id === currentStep;

            return (
              <React.Fragment key={step.id}>
                {/* Step Circle */}
                <button
                  onClick={() => onStepClick?.(step.id)}
                  className={`flex flex-col items-center transition-all ${
                    onStepClick ? 'cursor-pointer' : 'cursor-default'
                  }`}
                  disabled={!onStepClick}
                >
                  <div
                    className={`mb-2 rounded-full p-2 transition-all ${
                      isCompleted
                        ? 'bg-green-100'
                        : isCurrent
                        ? 'bg-primary-100 ring-2 ring-primary-500'
                        : 'bg-gray-100'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2
                        className="h-8 w-8 text-green-600"
                        strokeWidth={2}
                      />
                    ) : (
                      <Circle
                        className={`h-8 w-8 ${
                          isCurrent ? 'text-primary-600' : 'text-gray-400'
                        }`}
                        strokeWidth={2}
                      />
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isCurrent
                        ? 'text-gray-900'
                        : isCompleted
                        ? 'text-green-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="mt-1 text-xs text-gray-500">
                    {step.description}
                  </span>
                </button>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="mx-2 flex-1">
                    <div
                      className={`h-1 rounded-full transition-colors ${
                        isCompleted ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Mobile - Vertical */}
      <div className="md:hidden">
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = step.id === currentStep;

            return (
              <div key={step.id} className="flex items-start">
                {/* Left Connector and Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`rounded-full p-2 transition-all ${
                      isCompleted
                        ? 'bg-green-100'
                        : isCurrent
                        ? 'bg-primary-100 ring-2 ring-primary-500'
                        : 'bg-gray-100'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2
                        className="h-6 w-6 text-green-600"
                        strokeWidth={2}
                      />
                    ) : (
                      <Circle
                        className={`h-6 w-6 ${
                          isCurrent ? 'text-primary-600' : 'text-gray-400'
                        }`}
                        strokeWidth={2}
                      />
                    )}
                  </div>

                  {/* Vertical Connector */}
                  {index < steps.length - 1 && (
                    <div
                      className={`my-2 h-8 w-1 rounded-full transition-colors ${
                        isCompleted ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>

                {/* Step Content */}
                <div className="ml-4 flex-1">
                  <h3
                    className={`font-medium ${
                      isCurrent
                        ? 'text-gray-900'
                        : isCompleted
                        ? 'text-green-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {step.label}
                  </h3>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StepIndicator;
