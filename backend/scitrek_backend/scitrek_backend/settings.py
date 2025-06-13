# scitrek_backend/settings.py
import os
from pathlib import Path

# Pick up common settings first
from .base import *

# Then override with dev vs prod
if os.getenv('MYPROJECT_ENV') == 'prod':
    from .production import *
else:
    from .development import *

# -----------------------------------------
# Now define any project‑wide overrides here
# -----------------------------------------

# MEDIA (for file_uploads)
MEDIA_URL  = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# STATIC (whitenoise will serve from STATIC_ROOT in prod,
# and collectstatic will gather into STATIC_ROOT)
STATIC_URL        = '/static/'
STATICFILES_DIRS  = [ BASE_DIR / 'static' ]     # remove if you don't need a dev-only /static folder
STATIC_ROOT       = BASE_DIR / 'staticfiles'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Show what we loaded
print("🧠 Loaded settings module:", os.environ.get('DJANGO_SETTINGS_MODULE'))
