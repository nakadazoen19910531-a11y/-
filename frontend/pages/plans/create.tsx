import React, { useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/common/Tabs';
import StepIndicator from '@/components/common/StepIndicator';
import NotebookLMInput from '@/components/forms/NotebookLMInput';
import PDFUpload from '@/components/forms/PDFUpload';
import DataReview from '@/components/forms/DataReview';
import GenerationPanel from '@/components/forms/GenerationPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';

type Step = 'notebook' | 'pdf' | 'review' | 'generate';

interface FormData {
  notebookText: string;
  pdfFiles: File[];
  extractedData: Record<string, string>;
  mergedData: Record<string, string>;
}

const CreatePlanPage: NextPage = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('notebook');
  const [formData, setFormData] = useState<FormData>({
    notebookText: '',
    pdfFiles: [],
    extractedData: {},
    mergedData: {},
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/auth/login');
    return null;
  }

  const steps: Array<{ id: Step; label: string; description: string }> = [
    {
      id: 'notebook',
      label: 'NotebookLM入力',
      description: 'NotebookLMのテキストを入力',
    },
    {
      id: 'pdf',
      label: 'PDF設計図書',
      description: '設計図書をアップロード',
    },
    {
      id: 'review',
      label: 'データ確認',
      description: 'データを確認・編集',
    },
    {
      id: 'generate',
      label: '施工計画書作成',
      description: 'DOCX生成',
    },
  ];

  const handleNext = () => {
    const stepOrder: Step[] = ['notebook', 'pdf', 'review', 'generate'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    const stepOrder: Step[] = ['notebook', 'pdf', 'review', 'generate'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  return (
    <>
      <Head>
        <title>施工計画書作成 | 自動作成システム</title>
      </Head>

      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">施工計画書を作成</h1>
          <p className="mt-2 text-gray-600">
            NotebookLMと設計図書から自動で施工計画書を生成します
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator
          steps={steps}
          currentStep={currentStep}
          onStepClick={(step) => setCurrentStep(step)}
        />

        {/* Form Content */}
        <div className="rounded-lg border border-gray-200 bg-white p-8">
          {currentStep === 'notebook' && (
            <NotebookLMInput
              value={formData.notebookText}
              onChange={(text) => setFormData({ ...formData, notebookText: text })}
              onNext={handleNext}
            />
          )}

          {currentStep === 'pdf' && (
            <PDFUpload
              files={formData.pdfFiles}
              onFilesChange={(files) => setFormData({ ...formData, pdfFiles: files })}
              extractedData={formData.extractedData}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          )}

          {currentStep === 'review' && (
            <DataReview
              notebookData={formData.extractedData}
              pdfData={formData.extractedData}
              mergedData={formData.mergedData}
              onChange={(data) => setFormData({ ...formData, mergedData: data })}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          )}

          {currentStep === 'generate' && (
            <GenerationPanel
              formData={formData.mergedData}
              onPrev={handlePrev}
              onSuccess={() => {
                // Redirect to history or show success message
                router.push('/plans/history');
              }}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default CreatePlanPage;
