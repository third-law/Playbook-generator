'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Default competitive prompt
  const defaultPrompt = `Give me 20 clear reasons why [CUSTOMER_NAME] is not winning in the AI visibility space compared to the competitors. Do a thorough analysis of the competitors and explain what they are doing right, that [CUSTOMER_NAME] is not doing. Do deep research to understand the situation.`;

  // Form data state
  const [formData, setFormData] = useState({
    customerName: '',
    visibilityData: {
      topics: [] as string[],
      competitors: [] as string[],
      visibilityScore: 0,
      prompts: [],
      leaderboard: []
    },
    technicalData: {
      crawlerAccessible: false,
      hasSchema: false,
      ttfb: 0,
      wikipediaPresence: false,
      wikidataPresence: false,
      googleBusinessProfile: false,
      redditActivity: 'low' as 'low' | 'medium' | 'high',
      reviewCount: 0,
      reviewSentiment: 'mixed' as 'positive' | 'negative' | 'mixed'
    },
    technicalAnalysis: '',
    customPrompt: defaultPrompt,
    categoriesSelected: [] as string[],
    useMostImpactful: true,
    briefCount: 15
  });

  // Simplified steps - removed review and competitive prompt steps
  const steps = [
    { id: 1, name: 'Upload Data', description: 'Upload JSON file with AI search analysis' },
    { id: 2, name: 'Technical Analysis', description: 'Enter technical findings' },
    { id: 3, name: 'Configuration', description: 'Select brief options' }
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analyses/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create analysis');
      }

      const result = await response.json();
      console.log('Analysis created successfully:', result);
      
      router.push('/dashboard?success=analysis_created');
    } catch (error) {
      console.error('Error creating analysis:', error);
      alert('Failed to create analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError('');
    
    if (!file.name.endsWith('.json')) {
      setUploadError('Please upload a JSON file');
      return;
    }

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      
      if (validateJsonData(jsonData)) {
        populateFormFromJson(jsonData);
        // Don't auto advance - stay on same step to show confirmation
      } else {
        setUploadError('Invalid JSON format. Please check your file.');
      }
    } catch (error) {
      setUploadError('Error reading JSON file. Please ensure it\'s valid JSON.');
    }
  };

  const validateJsonData = (data: any): boolean => {
    return data && 
           data.params && 
           data.params.brandName && 
           data.analysisResult &&
           data.analysisResult.brandScores;
  };

  const populateFormFromJson = (jsonData: any) => {
    const params = jsonData.params || {};
    const analysisResult = jsonData.analysisResult || {};
    const brandScores = analysisResult.brandScores || {};
    
    const customerDomain = params.domain || params.company || '';
    const customerBrandScore = brandScores[customerDomain] || {};
    const visibilityScore = customerBrandScore.visibilityScore || 0;
    
    const competitors = params.competitors || [];
    const topics = params.categories || [];
    const customerName = params.brandName || params.company || customerDomain;
    
    setFormData(prev => ({
      ...prev,
      customerName,
      visibilityData: {
        topics,
        competitors,
        visibilityScore,
        prompts: jsonData.prompts || [],
        leaderboard: analysisResult.rankings || []
      }
    }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.json')) {
        // Create a synthetic event to reuse handleFileUpload
        const syntheticEvent = {
          target: { files: [file] }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileUpload(syntheticEvent);
      } else {
        setUploadError('Please upload a JSON file');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-50 scale-105' 
                  : formData.customerName 
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                id="jsonFile"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className={`mx-auto h-12 w-12 mb-4 ${
                isDragging ? 'text-indigo-500' : formData.customerName ? 'text-green-500' : 'text-gray-400'
              }`}>
                <svg className="h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {formData.customerName ? (
                <div>
                  <p className="text-sm font-medium text-green-700">✓ File uploaded successfully!</p>
                  <p className="text-sm text-green-600 mt-1">Customer: {formData.customerName}</p>
                  <p className="text-xs text-gray-500 mt-2">Click or drag to replace file</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    <span className={`font-medium ${
                      isDragging ? 'text-indigo-600' : 'text-indigo-600 hover:text-indigo-500'
                    }`}>
                      {isDragging ? 'Drop your file here' : 'Click to upload or drag and drop'}
                    </span>
                    {!isDragging && ' your JSON file'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">JSON files only</p>
                </>
              )}
            </div>

            {uploadError && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-700">{uploadError}</p>
              </div>
            )}

          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="technicalAnalysis" className="block text-sm font-medium text-gray-700">
                Technical Analysis
              </label>
              <textarea
                id="technicalAnalysis"
                rows={10}
                value={formData.technicalAnalysis}
                onChange={(e) => setFormData({...formData, technicalAnalysis: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Enter technical analysis findings here..."
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="briefCount" className="block text-sm font-medium text-gray-700">
                Number of Briefs to Generate
              </label>
              <div className="mt-2 flex items-center space-x-4">
                <input
                  type="range"
                  id="briefCount"
                  min="1"
                  max="30"
                  value={formData.briefCount}
                  onChange={(e) => setFormData({...formData, briefCount: parseInt(e.target.value)})}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-700 w-12">
                  {formData.briefCount}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Brief Selection Method
              </label>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="mostImpactful"
                    checked={formData.useMostImpactful}
                    onChange={(e) => setFormData({
                      ...formData,
                      useMostImpactful: e.target.checked,
                      categoriesSelected: e.target.checked ? [] : formData.categoriesSelected
                    })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="mostImpactful" className="ml-2 text-sm text-gray-700">
                    Select most impactful briefs across all categories
                  </label>
                </div>

                {!formData.useMostImpactful && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Or select specific categories (optional):
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        'Technology',
                        'Platform Presence',
                        'Content Structure',
                        'Content Types',
                        'Reviews and Testimonials',
                        'PR Outreach and LLM Seeding',
                        'Social Engagement and Community Strategy',
                        'Multimodal and Visual Optimization',
                        'Data Authority and Proprietary Statistics'
                      ].map((category) => (
                        <div key={category} className="flex items-center">
                          <input
                            id={`category-${category}`}
                            type="checkbox"
                            checked={formData.categoriesSelected.includes(category)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  categoriesSelected: [...formData.categoriesSelected, category]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  categoriesSelected: formData.categoriesSelected.filter(c => c !== category)
                                });
                              }
                            }}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`category-${category}`} className="ml-2 text-sm text-gray-700">
                            {category}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Settings button for competitive prompt */}
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
              >
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Advanced Settings
              </button>

              {showSettings && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <label htmlFor="customPrompt" className="block text-sm font-medium text-gray-700">
                    Competitive Analysis Prompt
                  </label>
                  <textarea
                    id="customPrompt"
                    rows={4}
                    value={formData.customPrompt}
                    onChange={(e) => setFormData({...formData, customPrompt: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    [CUSTOMER_NAME], [COMPETITORS], [VISIBILITY_SCORE], and [TOPICS] will be automatically replaced
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Create New Analysis</h1>
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <nav aria-label="Progress">
          <ol className="flex items-center justify-center space-x-5 mb-8">
            {steps.map((step, index) => (
              <li key={step.id} className="flex items-center">
                <div className={`flex items-center ${index < steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    currentStep >= step.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step.id}
                  </div>
                  <div className="ml-4 min-w-0">
                    <p className={`text-sm font-medium ${
                      currentStep >= step.id ? 'text-indigo-600' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </nav>

        {/* Form Content */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">
            {steps[currentStep - 1].name}
          </h2>
          
          {renderStepContent()}
          
          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {currentStep < steps.length ? (
              <button
                onClick={handleNext}
                disabled={currentStep === 1 && !formData.customerName}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Analysis...' : 'Create Analysis'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}