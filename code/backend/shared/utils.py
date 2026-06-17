import glob
import os
from datetime import datetime

def cleanup_cache(cache_dir="cache", days_old=7):
    files = glob.glob(os.path.join(cache_dir, "*"))
    for f in files:
        if (datetime.utcnow() - datetime.utcfromtimestamp(os.path.getmtime(f))).days > days_old:
            os.remove(f)
