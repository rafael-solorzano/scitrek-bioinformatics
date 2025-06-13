#scitrek_backend/settings/_init_.py
from .base import *
import os

if os.getenv('myproject') == 'prod':
    from .production import *
else:
    from .development import *
