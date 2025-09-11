'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Experience {
  company: string;
  role: string;
  duration: string;
  achievements: string[];
  technologies: string[];
}

interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

interface UserProfile {
  id?: string;
  seniority: 'junior' | 'mid' | 'senior' | 'lead';
  industries: string[];
  skills: Skill[];
  experience: Experience[];
  preferences: any;
}

export function ProfileManagement() {
  const [profile, setProfile] = useState<UserProfile>({
    seniority: 'mid',
    industries: [],
    skills: [],
    experience: [],
    preferences: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/me/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data) {
          setProfile({
            seniority: data.seniority || 'mid',
            industries: data.industries || [],
            skills: data.skills || [],
            experience: data.experience || [],
            preferences: data.preferences || {},
          });
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/me/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const addIndustry = (industry: string) => {
    if (industry && !profile.industries.includes(industry)) {
      setProfile(prev => ({
        ...prev,
        industries: [...prev.industries, industry],
      }));
    }
  };

  const removeIndustry = (industry: string) => {
    setProfile(prev => ({
      ...prev,
      industries: prev.industries.filter(i => i !== industry),
    }));
  };

  const addSkill = (skill: Skill) => {
    if (skill.name && !profile.skills.find(s => s.name === skill.name)) {
      setProfile(prev => ({
        ...prev,
        skills: [...prev.skills, skill],
      }));
    }
  };

  const removeSkill = (skillName: string) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s.name !== skillName),
    }));
  };

  const addExperience = () => {
    const newExperience: Experience = {
      company: '',
      role: '',
      duration: '',
      achievements: [],
      technologies: [],
    };
    setProfile(prev => ({
      ...prev,
      experience: [...prev.experience, newExperience],
    }));
  };

  const updateExperience = (index: number, field: keyof Experience, value: any) => {
    setProfile(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) => 
        i === index ? { ...exp, [field]: value } : exp
      ),
    }));
  };

  const removeExperience = (index: number) => {
    setProfile(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save Indicator */}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckIcon className="h-5 w-5 text-green-400 mr-3" />
            <p className="text-sm text-green-700">Profile saved successfully!</p>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
        </div>
        <div className="p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seniority Level
            </label>
            <select
              value={profile.seniority}
              onChange={(e) => setProfile(prev => ({ ...prev, seniority: e.target.value as any }))}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="junior">Junior (0-2 years)</option>
              <option value="mid">Mid-level (2-5 years)</option>
              <option value="senior">Senior (5-10 years)</option>
              <option value="lead">Lead/Principal (10+ years)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Industries */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Industries</h3>
          <p className="text-sm text-gray-600 mt-1">
            Add industries you have experience in or are interested in
          </p>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.industries.map((industry) => (
              <span
                key={industry}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {industry}
                <button
                  onClick={() => removeIndustry(industry)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </span>
            ))}
          </div>
          <IndustrySelector onAdd={addIndustry} />
        </div>
      </div>

      {/* Skills */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Skills</h3>
          <p className="text-sm text-gray-600 mt-1">
            Add your technical and professional skills
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {profile.skills.map((skill) => (
              <div
                key={skill.name}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
              >
                <div>
                  <span className="font-medium text-gray-900">{skill.name}</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    skill.level === 'expert' ? 'bg-purple-100 text-purple-800' :
                    skill.level === 'advanced' ? 'bg-green-100 text-green-800' :
                    skill.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {skill.level}
                  </span>
                </div>
                <button
                  onClick={() => removeSkill(skill.name)}
                  className="text-red-600 hover:text-red-800"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <SkillSelector onAdd={addSkill} />
        </div>
      </div>

      {/* Experience */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Work Experience</h3>
            <p className="text-sm text-gray-600 mt-1">
              Add your professional experience
            </p>
          </div>
          <button
            onClick={addExperience}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Experience
          </button>
        </div>
        <div className="p-6 space-y-6">
          {profile.experience.map((exp, index) => (
            <ExperienceForm
              key={index}
              experience={exp}
              onUpdate={(field, value) => updateExperience(index, field, value)}
              onRemove={() => removeExperience(index)}
            />
          ))}
          {profile.experience.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No experience added yet. Click "Add Experience" to get started.
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveProfile}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}

// Helper Components
function IndustrySelector({ onAdd }: { onAdd: (industry: string) => void }) {
  const [input, setInput] = useState('');
  const commonIndustries = [
    'Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Manufacturing',
    'Consulting', 'Media', 'Government', 'Non-profit', 'Automotive', 'Real Estate'
  ];

  const handleAdd = () => {
    if (input.trim()) {
      onAdd(input.trim());
      setInput('');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Enter industry name"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {commonIndustries.map((industry) => (
          <button
            key={industry}
            onClick={() => onAdd(industry)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-gray-50"
          >
            {industry}
          </button>
        ))}
      </div>
    </div>
  );
}

function SkillSelector({ onAdd }: { onAdd: (skill: Skill) => void }) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState<Skill['level']>('intermediate');

  const handleAdd = () => {
    if (name.trim()) {
      onAdd({ name: name.trim(), level });
      setName('');
      setLevel('intermediate');
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        placeholder="Skill name"
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        value={level}
        onChange={(e) => setLevel(e.target.value as Skill['level'])}
        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
        <option value="expert">Expert</option>
      </select>
      <button
        onClick={handleAdd}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Add
      </button>
    </div>
  );
}

function ExperienceForm({ 
  experience, 
  onUpdate, 
  onRemove 
}: { 
  experience: Experience;
  onUpdate: (field: keyof Experience, value: any) => void;
  onRemove: () => void;
}) {
  const [newAchievement, setNewAchievement] = useState('');
  const [newTechnology, setNewTechnology] = useState('');

  const addAchievement = () => {
    if (newAchievement.trim()) {
      onUpdate('achievements', [...experience.achievements, newAchievement.trim()]);
      setNewAchievement('');
    }
  };

  const removeAchievement = (index: number) => {
    onUpdate('achievements', experience.achievements.filter((_, i) => i !== index));
  };

  const addTechnology = () => {
    if (newTechnology.trim()) {
      onUpdate('technologies', [...experience.technologies, newTechnology.trim()]);
      setNewTechnology('');
    }
  };

  const removeTechnology = (index: number) => {
    onUpdate('technologies', experience.technologies.filter((_, i) => i !== index));
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-md font-medium text-gray-900">Experience Entry</h4>
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-800"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
          <input
            type="text"
            value={experience.company}
            onChange={(e) => onUpdate('company', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <input
            type="text"
            value={experience.role}
            onChange={(e) => onUpdate('role', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
          <input
            type="text"
            value={experience.duration}
            onChange={(e) => onUpdate('duration', e.target.value)}
            placeholder="e.g., 2020-2023"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Achievements</label>
          <div className="space-y-2 mb-2">
            {experience.achievements.map((achievement, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">{achievement}</span>
                <button
                  onClick={() => removeAchievement(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newAchievement}
              onChange={(e) => setNewAchievement(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addAchievement()}
              placeholder="Add an achievement"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addAchievement}
              className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Technologies</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {experience.technologies.map((tech, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-gray-100 text-gray-800"
              >
                {tech}
                <button
                  onClick={() => removeTechnology(index)}
                  className="ml-1 text-gray-600 hover:text-gray-800"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTechnology}
              onChange={(e) => setNewTechnology(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTechnology()}
              placeholder="Add a technology"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addTechnology}
              className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}