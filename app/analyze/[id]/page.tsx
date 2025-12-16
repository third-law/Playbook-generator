'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Brief {
  id: string;
  category: string;
  title: string;
  description: string;
  why_it_matters: string;
  implementation_steps: string[];
  effort_score: number;
  impact_score: number;
  effort_impact_score: number;
  keywords: string[];
  timeline: string;
}

interface Analysis {
  id: string;
  customer_name: string;
  status: string;
  created_at: string;
  completed_at: string;
  visibility_score: number;
  brief_count: number;
  competitors: string[];
  topics: string[];
}

export default function AnalysisViewPage() {
  const params = useParams();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const analysisId = params.id;

  useEffect(() => {
    if (analysisId) {
      fetchAnalysisDetails();
    }
  }, [analysisId]);

  const fetchAnalysisDetails = async () => {
    try {
      const [analysisResponse, briefsResponse] = await Promise.all([
        fetch(`/api/analyses/${analysisId}`),
        fetch(`/api/analyses/${analysisId}/briefs`)
      ]);

      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        setAnalysis(analysisData.analysis);
      }

      if (briefsResponse.ok) {
        const briefsData = await briefsResponse.json();
        setBriefs(briefsData.briefs);
      }
    } catch (error) {
      console.error('Error fetching analysis details:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(briefs.map(brief => brief.category)))];

  const filteredBriefs = briefs.filter(brief => {
    const matchesSearch = brief.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         brief.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || brief.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const exportToMarkdown = () => {
    if (!analysis) return;

    let markdown = `# AI Visibility Analysis: ${analysis.customer_name}\n\n`;
    markdown += `**Generated:** ${new Date(analysis.created_at).toLocaleDateString()}\n`;
    markdown += `**Visibility Score:** ${analysis.visibility_score}%\n`;
    markdown += `**Total Briefs:** ${briefs.length}\n\n`;

    if (analysis.competitors?.length > 0) {
      markdown += `**Competitors:** ${analysis.competitors.join(', ')}\n\n`;
    }

    if (analysis.topics?.length > 0) {
      markdown += `**Topics:** ${analysis.topics.join(', ')}\n\n`;
    }

    categories.filter(cat => cat !== 'All').forEach(category => {
      const categoryBriefs = briefs.filter(brief => brief.category === category);
      if (categoryBriefs.length === 0) return;

      markdown += `## ${category}\n\n`;
      
      categoryBriefs.forEach(brief => {
        markdown += `### ${brief.title}\n\n`;
        markdown += `**Score:** ${brief.effort_impact_score} (Effort: ${brief.effort_score}/10, Impact: ${brief.impact_score}/10)\n\n`;
        markdown += `**Timeline:** ${brief.timeline}\n\n`;
        markdown += `**Description:** ${brief.description}\n\n`;
        markdown += `**Why it matters:** ${brief.why_it_matters}\n\n`;
        markdown += `**Implementation Steps:**\n`;
        brief.implementation_steps.forEach((step, index) => {
          markdown += `${index + 1}. ${step}\n`;
        });
        markdown += `\n`;
        if (brief.keywords.length > 0) {
          markdown += `**Keywords:** ${brief.keywords.join(', ')}\n\n`;
        }
        markdown += `---\n\n`;
      });
    });

    // Download markdown file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysis.customer_name.replace(/\s+/g, '_')}_AI_Visibility_Analysis.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Analysis not found</p>
          <Link href="/dashboard" className="mt-4 text-indigo-600 hover:text-indigo-800">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{analysis.customer_name}</h1>
              <p className="text-sm text-gray-500">
                {briefs.length} briefs • Generated {new Date(analysis.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={exportToMarkdown}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
              >
                Export Markdown
              </button>
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Analysis Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Visibility Score</p>
              <p className="text-2xl font-semibold text-gray-900">{analysis.visibility_score}%</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Briefs</p>
              <p className="text-2xl font-semibold text-gray-900">{briefs.length}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className="text-2xl font-semibold text-green-600 capitalize">{analysis.status}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Avg. Score</p>
              <p className="text-2xl font-semibold text-gray-900">
                {Math.round(briefs.reduce((sum, brief) => sum + brief.effort_impact_score, 0) / briefs.length) || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search briefs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Briefs List */}
        <div className="space-y-6">
          {filteredBriefs.map((brief) => (
            <div key={brief.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{brief.title}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {brief.category}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{brief.description}</p>
                    <p className="text-sm text-gray-500 italic">Why it matters: {brief.why_it_matters}</p>
                  </div>
                  <div className="ml-6 text-right">
                    <div className="text-2xl font-bold text-indigo-600">{brief.effort_impact_score}</div>
                    <div className="text-xs text-gray-500">Score</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Effort</p>
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-orange-600 h-2 rounded-full" 
                          style={{width: `${brief.effort_score * 10}%`}}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{brief.effort_score}/10</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Impact</p>
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{width: `${brief.impact_score * 10}%`}}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{brief.impact_score}/10</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Timeline</p>
                    <p className="text-sm text-gray-900">{brief.timeline}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500 mb-2">Implementation Steps:</p>
                  <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                    {brief.implementation_steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>

                {brief.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {brief.keywords.map((keyword, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredBriefs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No briefs found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}