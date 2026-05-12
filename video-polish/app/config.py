from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str
    storage_dir: str = "./storage"
    default_voice: str = "nova"
    tts_model: str = "tts-1-hd"
    whisper_model: str = "whisper-1"
    cleanup_model: str = "gpt-4o-mini"

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # CORS — comma-separated list of allowed origins
    cors_origins: str = "http://localhost:5173,http://localhost"

    # Cloudflare R2
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = "clipkatha"
    r2_public_url: str = "https://pub-4919c2146317426eb560bc9c132a65c4.r2.dev"

    model_config = {"env_file": ".env"}

    @property
    def r2_enabled(self) -> bool:
        return bool(self.r2_account_id and self.r2_access_key_id and self.r2_secret_access_key)



settings = Settings()
