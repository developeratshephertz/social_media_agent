import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuthStore } from '../store/authStore.js';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';

function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Clear errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Handle Google callback
  const handleGoogleCallback = async (response) => {
    try {
      console.log('🔍 Google callback response:', response);
      console.log('🔍 Response credential:', response.credential);
      console.log('🔍 Credential type:', typeof response.credential);
      console.log('🔍 Credential length:', response.credential ? response.credential.length : 'undefined');

      if (!response.credential) {
        console.error('❌ No credential in Google response');
        throw new Error('No credential received from Google');
      }

      const result = await login(response.credential);
      if (result.success) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
    try {
      console.log('🔍 Triggering Google OAuth...');
      if (window.google && window.google.accounts) {
        // Create a temporary button to trigger the OAuth flow
        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);

        window.google.accounts.id.renderButton(tempDiv, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 200,
          logo_alignment: 'left',
          type: 'standard'
        });

        // Trigger click on the rendered button
        setTimeout(() => {
          const button = tempDiv.querySelector('div[role="button"]');
          if (button) {
            button.click();
          }
          // Clean up
          document.body.removeChild(tempDiv);
        }, 100);
      } else {
        console.error('❌ Google Identity Services not loaded');
      }
    } catch (error) {
      console.error('❌ Google login error:', error);
    }
  };

  // Initialize Google OAuth when component mounts
  useEffect(() => {
    const initializeGoogleAuth = async () => {
      try {
        // Load Google Identity Services
        if (!window.google) {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          document.head.appendChild(script);

          await new Promise((resolve) => {
            script.onload = () => {
              console.log('✅ Google Identity Services script loaded');
              resolve();
            };
            script.onerror = (error) => {
              console.error('❌ Failed to load Google Identity Services script:', error);
              resolve();
            };
          });
        }

        if (window.google && window.google.accounts) {
          console.log('🔧 Initializing Google Identity Services...');
          // Initialize Google Identity Services with popup flow
          window.google.accounts.id.initialize({
            client_id: '864294913881-4fk0t2hpk8mgc5b5ai7ck85mlsebhqto.apps.googleusercontent.com',
            callback: handleGoogleCallback,
            use_fedcm_for_prompt: false, // Disable FedCM to avoid CORS issues
            auto_select: false, // Don't auto-select, but allow the button to show remembered user
            cancel_on_tap_outside: true,
            // Disable the floating One Tap prompt completely
            use_fedcm_for_prompt: false,
            itp_support: false
          });

          console.log('🎯 Setting up custom Google sign-in button...');

          // Disable auto-select to prevent floating One Tap
          window.google.accounts.id.disableAutoSelect();
        }
      } catch (error) {
        console.error('❌ Google OAuth initialization error:', error);
      }
    };

    initializeGoogleAuth();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // For now, we only support Google OAuth
    // This form is kept for future email/password login
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80 flex items-center justify-center p-4">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gradient-primary-start to-gradient-primary-end flex items-center justify-center">
              <span className="text-2xl font-bold text-white">SM</span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Welcome Back</h1>
            <p className="text-[var(--text-muted)]">Sign in to your Social Media Agent account</p>
          </div>

          <Card className="p-8">
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Custom Google Sign In Button */}
            <div className="space-y-4">
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg flex items-center justify-center gap-4 hover:border-[var(--primary)] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200 cursor-pointer font-medium text-[var(--text)] group relative disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Google Logo */}
                <div className="w-6 h-6 flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-full h-full">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>

                {/* Button Text */}
                <span className="text-sm font-medium">
                  {isLoading ? 'Signing in...' : 'Continue with Google'}
                </span>

                {/* Hover Effect Overlay */}
                <div className="absolute inset-0 bg-[var(--primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>
              </button>
              {isLoading && (
                <div className="w-full flex items-center justify-center gap-3 border-2 border-[var(--primary)] rounded-lg py-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border)]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[var(--background)] text-[var(--text-muted)]">Or continue with email</span>
                </div>
              </div>

              {/* Email/Password Form (for future use) */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--text)] mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-colors"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[var(--text)] mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-12 py-3 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-colors"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-[var(--primary)] bg-[var(--surface)] border-[var(--border)] rounded focus:ring-[var(--primary)] focus:ring-2"
                    />
                    <span className="ml-2 text-sm text-[var(--text-muted)]">Remember me</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  Sign In
                </Button>
              </form>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="text-[var(--primary)] hover:text-[var(--primary)]/80 font-medium transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </Card>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-[var(--text-muted)]">
            <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
