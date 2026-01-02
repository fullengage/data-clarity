import uvicorn
from app.main import app

if __name__ == "__main__":
    # Inicia o servidor uvicorn na porta 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
