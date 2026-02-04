'use client';

import { Check } from 'lucide-react';
import clsx from 'clsx';

interface Step {
  id: number;
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          {/* Step Circle */}
          <div className="flex flex-col items-center">
            <div
              className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all',
                step.id < currentStep
                  ? 'bg-green-500 text-white'
                  : step.id === currentStep
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              )}
            >
              {step.id < currentStep ? (
                <Check className="w-5 h-5" />
              ) : (
                step.id
              )}
            </div>
            <span
              className={clsx(
                'mt-2 text-sm font-medium',
                step.id === currentStep
                  ? 'text-primary-600 dark:text-primary-400'
                  : step.id < currentStep
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {step.label}
            </span>
          </div>

          {/* Connector Line */}
          {index < steps.length - 1 && (
            <div
              className={clsx(
                'w-24 h-1 mx-4',
                step.id < currentStep
                  ? 'bg-green-500'
                  : 'bg-gray-200 dark:bg-gray-700'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
