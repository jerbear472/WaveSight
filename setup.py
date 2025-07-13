#!/usr/bin/env python3
"""
WaveSight Setup Script
Helps users configure their environment and check dependencies
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def print_banner():
    print("""
    ██╗    ██╗ █████╗ ██╗   ██╗███████╗███████╗██╗ ██████╗ ██╗  ██╗████████╗
    ██║    ██║██╔══██╗██║   ██║██╔════╝██╔════╝██║██╔════╝ ██║  ██║╚══██╔══╝
    ██║ █╗ ██║███████║██║   ██║█████╗  ███████╗██║██║  ███╗███████║   ██║   
    ██║███╗██║██╔══██║╚██╗ ██╔╝██╔══╝  ╚════██║██║██║   ██║██╔══██║   ██║   
    ╚███╔███╔╝██║  ██║ ╚████╔╝ ███████╗███████║██║╚██████╔╝██║  ██║   ██║   
     ╚══╝╚══╝ ╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   
    
    🌊 Social Intelligence & Trend Tracking Platform
    """)

def check_python_version():
    """Check if Python version is compatible"""
    print("🐍 Checking Python version...")
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        print(f"   Current version: {sys.version}")
        sys.exit(1)
    else:
        print(f"✅ Python {sys.version.split()[0]} detected")

def check_node_version():
    """Check if Node.js is available"""
    print("📦 Checking Node.js...")
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Node.js {result.stdout.strip()} detected")
            return True
        else:
            print("⚠️ Node.js not found - some features may not work")
            return False
    except FileNotFoundError:
        print("⚠️ Node.js not found - install from https://nodejs.org")
        return False

def check_pip_packages():
    """Check and install required Python packages"""
    print("📦 Checking Python dependencies...")
    
    required_packages = [
        'flask',
        'flask-cors',
        'praw',
        'openai',
        'supabase',
        'vaderSentiment',
        'requests',
        'python-dotenv'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - needs installation")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n🔧 Installing missing packages: {', '.join(missing_packages)}")
        try:
            subprocess.check_call([
                sys.executable, '-m', 'pip', 'install'
            ] + missing_packages)
            print("✅ All Python packages installed successfully")
        except subprocess.CalledProcessError:
            print("❌ Failed to install packages. Please run manually:")
            print(f"   pip install {' '.join(missing_packages)}")
            return False
    
    return True

def setup_environment_file():
    """Set up the .env file from template"""
    print("⚙️ Setting up environment configuration...")
    
    env_file = Path('.env')
    env_example = Path('.env.example')
    
    if env_file.exists():
        print("✅ .env file already exists")
        return True
    
    if env_example.exists():
        try:
            shutil.copy(env_example, env_file)
            print("✅ Created .env file from template")
            print("📝 Please edit .env file with your API keys:")
            print("   - Supabase URL and keys")
            print("   - YouTube API key")
            print("   - Reddit API credentials")
            print("   - OpenAI API key (optional)")
            return True
        except Exception as e:
            print(f"❌ Failed to create .env file: {e}")
            return False
    else:
        print("❌ .env.example template not found")
        return False

def check_supabase_schema():
    """Check if Supabase schema file exists"""
    print("🗄️ Checking database schema...")
    
    schema_file = Path('CONFIG/supabase_schema.sql')
    if schema_file.exists():
        print("✅ Supabase schema file found")
        print("📝 Remember to run this schema in your Supabase SQL editor")
        return True
    else:
        print("⚠️ Supabase schema file not found")
        return False

def create_directories():
    """Create necessary directories"""
    print("📁 Creating directories...")
    
    dirs_to_create = [
        'logs',
        'data',
        'temp'
    ]
    
    for dir_name in dirs_to_create:
        try:
            Path(dir_name).mkdir(exist_ok=True)
            print(f"✅ Created {dir_name}/ directory")
        except Exception as e:
            print(f"⚠️ Could not create {dir_name}/ directory: {e}")

def check_git_config():
    """Check if project is in git repository"""
    print("📊 Checking Git configuration...")
    
    if Path('.git').exists():
        print("✅ Git repository detected")
        
        # Check if .env is in .gitignore
        gitignore = Path('.gitignore')
        if gitignore.exists():
            content = gitignore.read_text()
            if '.env' in content:
                print("✅ .env file is properly ignored in Git")
            else:
                print("⚠️ .env file should be added to .gitignore")
                try:
                    with open('.gitignore', 'a') as f:
                        f.write('\n# Environment variables\n.env\nlogs/\ntemp/\n')
                    print("✅ Added .env to .gitignore")
                except Exception as e:
                    print(f"⚠️ Could not update .gitignore: {e}")
        else:
            print("⚠️ No .gitignore file found")
    else:
        print("⚠️ Not a Git repository")

def print_next_steps():
    """Print next steps for the user"""
    print("\n🚀 Setup complete! Next steps:")
    print("\n1. 📝 Configure your API keys in .env file")
    print("   - Get Supabase credentials from your project")
    print("   - Get YouTube API key from Google Cloud Console")
    print("   - Get Reddit API credentials from reddit.com/prefs/apps")
    print("   - (Optional) Get OpenAI API key for enhanced sentiment analysis")
    
    print("\n2. 🗄️ Set up your Supabase database")
    print("   - Run CONFIG/supabase_schema.sql in your Supabase SQL editor")
    print("   - Enable Row Level Security if needed")
    
    print("\n3. 🔧 Start the services")
    print("   Python services:")
    print("   python SERVER/sentiment_server.py")
    print("   node SCRIPTS/youtubeToSupabase.js")
    
    print("\n4. 🌐 Open your frontend")
    print("   Open index.html in your browser")
    print("   Or use a local server: python -m http.server 8080")
    
    print("\n5. 📊 Test the functionality")
    print("   Try analyzing sentiment for a topic")
    print("   Check the Cultural Compass with multiple trends")
    
    print("\n🆘 Need help? Check the DOCS/ folder for detailed guides")

def main():
    """Main setup function"""
    print_banner()
    
    print("🔧 WaveSight Setup & Configuration Tool")
    print("=====================================\n")
    
    # Check system requirements
    check_python_version()
    check_node_version()
    
    # Install dependencies
    if not check_pip_packages():
        print("⚠️ Some packages failed to install. Please install manually.")
    
    # Set up configuration
    setup_environment_file()
    check_supabase_schema()
    
    # Create directories
    create_directories()
    
    # Git configuration
    check_git_config()
    
    # Final instructions
    print_next_steps()
    
    print("\n✅ WaveSight setup completed successfully!")

if __name__ == "__main__":
    main()