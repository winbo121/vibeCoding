from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args={"options": "-c client_encoding=UTF8"},
)


@event.listens_for(engine, "connect")
def _set_utf8(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("SET CLIENT_ENCODING TO 'UTF8'")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
