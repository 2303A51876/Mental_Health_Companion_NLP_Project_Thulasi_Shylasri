import os

# Test-only secrets; never used outside the test process.
os.environ.setdefault("JWT_SECRET", "change_me_test_secret")
os.environ.setdefault("DATA_ENCRYPTION_KEY", "Zm9yLXRlc3RzLW9ubHktMzItYnl0ZXMta2V5ISEhISE=")  # 32 bytes b64
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://mhc:mhc@localhost:5432/mhc_test")
