import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { User as UserIcon, Mail, Calendar, Shield, Settings, Save, Edit3 } from 'lucide-react';
import { apiClient } from '@/lib/api';

// Using the User interface from supabase.ts
import { User } from '@/lib/supabase';

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth0();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    location: '',
    website: ''
  });

  useEffect(() => {
    if (!authLoading && user) {
      fetchProfile();
    }
  }, [authLoading, user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const profileData = await apiClient.getUserProfile();
      setProfile(profileData);
      setFormData({
        name: profileData.name || '',
        bio: profileData.bio || '',
        location: profileData.location || '',
        website: profileData.website || ''
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedProfile = await apiClient.updateUserProfile(formData);
      setProfile(updatedProfile);
      setEditing(false);
      setError(null);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || ''
      });
    }
    setEditing(false);
    setError(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="h-20 w-20 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Profile</h3>
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchProfile}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account information and preferences</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center">
                  {user?.picture ? (
                    <img
                      className="h-20 w-20 rounded-full"
                      src={user.picture}
                      alt={user.name || 'Profile'}
                    />
                  ) : (
                    <UserIcon className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <div className="text-white">
                  <h2 className="text-2xl font-bold">
                    {profile?.name || user?.name || 'Anonymous User'}
                  </h2>
                  <p className="text-blue-100">{profile?.email || user?.email}</p>
                  {profile?.createdAt && (
                    <p className="text-blue-100 text-sm mt-1">
                      Member since {formatDate(profile.createdAt)}
                    </p>
                  )}
                </div>
              </div>
              
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center px-4 py-2 border border-white text-sm font-medium rounded-md text-white hover:bg-white hover:text-blue-600 transition-colors"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Form Section */}
          <div className="px-6 py-6">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <UserIcon className="w-5 h-5 mr-2" />
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Name
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your display name"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                        {profile?.name || 'Not set'}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-500 flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      {profile?.email || user?.email}
                      <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">Verified</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Additional Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bio
                    </label>
                    {editing ? (
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        rows={3}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Tell us about yourself..."
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 min-h-[80px]">
                        {profile?.bio || 'No bio added yet'}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="City, Country"
                        />
                      ) : (
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                          {profile?.location || 'Not set'}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website
                      </label>
                      {editing ? (
                        <input
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="https://example.com"
                        />
                      ) : (
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                          {profile?.website ? (
                            <a
                              href={profile.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              {profile.website}
                            </a>
                          ) : (
                            'Not set'
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Account Information
                </h3>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Account ID</span>
                    <span className="text-sm text-gray-500 font-mono">{profile?.id || 'Loading...'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Member Since</span>
                    <span className="text-sm text-gray-500 flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {profile?.createdAt ? formatDate(profile.createdAt) : 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Last Updated</span>
                    <span className="text-sm text-gray-500">
                      {profile?.updatedAt ? formatDate(profile.updatedAt) : 'Never'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {editing && (
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Security Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Security
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Two-Factor Authentication</span>
                <span className="text-sm text-gray-500">Managed by Auth0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Password</span>
                <span className="text-sm text-gray-500">Managed by Auth0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Login Sessions</span>
                <span className="text-sm text-gray-500">Active</span>
              </div>
            </div>
          </div>

          {/* Preferences Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Preferences
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Email Notifications</span>
                <span className="text-sm text-green-600">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Price Alerts</span>
                <span className="text-sm text-green-600">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Chat Notifications</span>
                <span className="text-sm text-green-600">Enabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}