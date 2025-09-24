import React, { useState, useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';

export default function IdeaGenerator() {
  // State for all form inputs
  const [ageRange, setAgeRange] = useState([18, 35]);
  const [platforms, setPlatforms] = useState([]);
  const [goals, setGoals] = useState([]);
  const [location, setLocation] = useState('');
  const [brandVoice, setBrandVoice] = useState('');
  const [trendMinerFile, setTrendMinerFile] = useState(null);
  const [brandAssets, setBrandAssets] = useState([]);
  const [competitorAssets, setCompetitorAssets] = useState('');
  const [seasonalEvent, setSeasonalEvent] = useState('');
  const [extraInfo, setExtraInfo] = useState('');

  const sliderRef = useRef(null);
  const [isDragging, setIsDragging] = useState(null);

  const handleSliderMouseDown = useCallback((e, thumb) => {
    e.preventDefault();
    setIsDragging(thumb);
  }, []);

  const handleSliderMouseMove = useCallback((e) => {
    if (!isDragging || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const value = Math.round(0 + percentage * (65 - 0));

    setAgeRange(prev => {
      const newRange = [...prev];
      if (isDragging === 'min') {
        newRange[0] = Math.min(value, newRange[1] - 1);
      } else {
        newRange[1] = Math.max(value, newRange[0] + 1);
      }
      return newRange;
    });
  }, [isDragging]);

  const handleSliderMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleSliderMouseMove);
      document.addEventListener('mouseup', handleSliderMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleSliderMouseMove);
        document.removeEventListener('mouseup', handleSliderMouseUp);
      };
    }
  }, [isDragging, handleSliderMouseMove, handleSliderMouseUp]);

  const handleGoalToggle = (goal) => {
    setGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const handlePlatformToggle = (platform) => {
    setPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleFileUpload = (e, type) => {
    const files = Array.from(e.target.files);
    if (type === 'trendMiner') {
      setTrendMinerFile(files[0]);
    } else if (type === 'brandAssets') {
      setBrandAssets(prev => [...prev, ...files]);
    }
  };

  const handleGenerateIdea = () => {
    // This would typically send data to backend
    alert('Ideas generated! (This is a hardcoded UI demo)');
  };

  const handleClear = () => {
    setAgeRange([18, 35]);
    setPlatforms([]);
    setGoals([]);
    setLocation('');
    setBrandVoice('');
    setTrendMinerFile(null);
    setBrandAssets([]);
    setCompetitorAssets('');
    setSeasonalEvent('');
    setExtraInfo('');
  };

  const goalOptions = ['Awareness', 'Engagement', 'Brand Building', 'Lead Generation', 'Sales'];
  const brandVoiceOptions = ['Friendly', 'Professional', 'Casual', 'Formal', 'Humorous', 'Inspiring'];
  const platformOptions = ['Facebook', 'Reddit', 'Twitter/X'];

  const minPercentage = ((ageRange[0] - 0) / (65 - 0)) * 100;
  const maxPercentage = ((ageRange[1] - 0) / (65 - 0)) * 100;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Idea Generator"
        description="Create compelling content ideas with AI-powered insights and targeting"
      />
      
      {/* Pillars Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-[var(--text)]">Pillars</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Audience Card */}
            <Card title={<span>Audience <span className="text-xs text-[var(--text-muted)] font-normal">(Age Group)</span></span>}>
              <div className="space-y-6">
                <div className="flex justify-between text-xs text-[var(--text-muted)]">
                  <span>0</span>
                  <span>65+</span>
                </div>
                
                <div className="relative h-2" ref={sliderRef}>
                  {/* Track background */}
                  <div className="absolute w-full h-2 bg-[var(--bg-muted)] rounded-lg top-0"></div>
                  
                  {/* Active range */}
                  <div 
                    className="absolute h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg top-0"
                    style={{
                      left: `${minPercentage}%`,
                      width: `${maxPercentage - minPercentage}%`
                    }}
                  ></div>
                  
                  {/* Min thumb */}
                  <div 
                    className="absolute w-5 h-5 bg-white border-2 border-blue-500 rounded-full cursor-pointer shadow-md hover:shadow-lg transition-shadow"
                    style={{ left: `${minPercentage}%`, transform: 'translateX(-50%) translateY(-6px)', top: '0px' }}
                    onMouseDown={(e) => handleSliderMouseDown(e, 'min')}
                  ></div>
                  
                  {/* Max thumb */}
                  <div 
                    className="absolute w-5 h-5 bg-white border-2 border-blue-500 rounded-full cursor-pointer shadow-md hover:shadow-lg transition-shadow"
                    style={{ left: `${maxPercentage}%`, transform: 'translateX(-50%) translateY(-6px)', top: '0px' }}
                    onMouseDown={(e) => handleSliderMouseDown(e, 'max')}
                  ></div>
                </div>
                
                <div className="flex justify-between text-sm font-medium text-[var(--text)]">
                  <span className="bg-[var(--bg-muted)] px-2 py-1 rounded text-xs">{ageRange[0]} years</span>
                  <span className="bg-[var(--bg-muted)] px-2 py-1 rounded text-xs">{ageRange[1]} years</span>
                </div>
              </div>
            </Card>

            {/* Platform Card */}
            <Card title="Platform">
              <div className="flex flex-wrap gap-2">
                {platformOptions.map((platform) => (
                  <button
                    key={platform}
                    onClick={() => handlePlatformToggle(platform)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      platforms.includes(platform)
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-[var(--bg-muted)] text-[var(--text)] hover:bg-blue-100 border border-[var(--border)]'
                    }`}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </Card>

            {/* Location Card */}
            <Card title="Location">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter city, country, or 'global'"
                className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Goals Card */}
            <Card title="Goals">
              <div className="flex flex-wrap items-start gap-3">
                {goalOptions.map((goal) => (
                  <label key={goal} className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={goals.includes(goal)}
                      onChange={() => handleGoalToggle(goal)}
                      className="w-4 h-4 text-blue-500 border-[var(--border)] rounded focus:ring-blue-500"
                    />
                    <span className="text-[var(--text)] text-sm whitespace-nowrap">{goal}</span>
                  </label>
                ))}
              </div>
            </Card>

            {/* Brand Voice Card */}
            <Card title="Brand Voice">
              <div className="flex flex-wrap items-start gap-3">
                {brandVoiceOptions.map((voice) => (
                  <label key={voice} className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="brandVoice"
                      value={voice}
                      checked={brandVoice === voice}
                      onChange={(e) => setBrandVoice(e.target.value)}
                      className="w-4 h-4 text-blue-500 border-[var(--border)] focus:ring-blue-500"
                    />
                    <span className="text-[var(--text)] text-sm whitespace-nowrap">{voice}</span>
                  </label>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Information Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-[var(--text)]">Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trend Miner Card */}
          <Card title="Trend Miner">
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <Upload className="w-8 h-8 mx-auto mb-3 text-blue-500" />
              <p className="text-sm text-[var(--text-muted)] mb-3">Upload CSV file for trend analysis</p>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'trendMiner')}
                className="hidden"
                id="trend-upload"
              />
              <label
                htmlFor="trend-upload"
                className="inline-block bg-blue-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                Choose File
              </label>
              {trendMinerFile && (
                <p className="text-sm text-[var(--text)] mt-3 p-2 bg-[var(--bg-muted)] rounded">
                  📄 {trendMinerFile.name}
                </p>
              )}
            </div>
          </Card>

          {/* Brand Assets Card */}
          <Card title="Brand Assets">
            <div className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
              <Upload className="w-8 h-8 mx-auto mb-3 text-green-500" />
              <p className="text-sm text-[var(--text-muted)] mb-3">Upload images, videos, or assets</p>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => handleFileUpload(e, 'brandAssets')}
                className="hidden"
                id="brand-upload"
              />
              <label
                htmlFor="brand-upload"
                className="inline-block bg-green-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-green-600 transition-colors text-sm font-medium"
              >
                Choose Files
              </label>
              {brandAssets.length > 0 && (
                <p className="text-sm text-[var(--text)] mt-3 p-2 bg-[var(--bg-muted)] rounded">
                  📁 {brandAssets.length} file{brandAssets.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </Card>

          {/* Competitor Assets Card */}
          <Card title="Competitor Assets">
            <textarea
              value={competitorAssets}
              onChange={(e) => setCompetitorAssets(e.target.value)}
              placeholder="Enter competitor URLs..."
              rows={4}
              className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] text-sm placeholder-[var(--text-muted)] placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all"
            />
          </Card>

          {/* Seasonal Event Card */}
          <Card title="Seasonal Event">
            <input
              type="text"
              value={seasonalEvent}
              onChange={(e) => setSeasonalEvent(e.target.value)}
              placeholder="e.g., Black Friday, Christmas"
              className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] text-sm placeholder-[var(--text-muted)] placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </Card>
        </div>
      </div>

      {/* Extra Information Card */}
      <Card title="Extra Information">
        <textarea
          value={extraInfo}
          onChange={(e) => setExtraInfo(e.target.value)}
          placeholder="Add any extra details or requirements..."
          rows={4}
          className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] text-sm placeholder-[var(--text-muted)] placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all"
        />
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
        <button
          onClick={handleGenerateIdea}
          className="glass-hover bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          ✨ Generate Ideas
        </button>
        <button
          onClick={handleClear}
          className="glass-hover bg-[var(--surface)] text-[var(--text)] px-8 py-3 rounded-2xl font-medium border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-all duration-300"
        >
          🗑️ Clear All
        </button>
      </div>
    </div>
  );
}