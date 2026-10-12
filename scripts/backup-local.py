"""Create a private SQLite backup archive for the native local runtime."""
import argparse,os,pathlib,sqlite3,tarfile,tempfile
root=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description="Back up the local Mission Control database, uploads, encryption key and env files.")
parser.add_argument("output",type=pathlib.Path,help="New .tar.gz archive path; an existing archive is never overwritten.")
args=parser.parse_args();output=args.output.resolve();database=root/"server/data/mission-control.db"
if not database.exists():database=root/("server/data/"+"task"+"flow.db")
if not database.is_file():parser.error("Local database is missing")
if output.exists():parser.error("Output already exists")
output.parent.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix="mission-backup-",dir=output.parent)as temporary:
 snapshot=pathlib.Path(temporary)/"mission-control.db"
 with sqlite3.connect("file:"+str(database)+"?mode=ro",uri=True)as source:
  with sqlite3.connect(snapshot)as dest:source.backup(dest)
 with output.open("xb")as archive_file:
  os.fchmod(archive_file.fileno(),0o600)
  try:
   with tarfile.open(fileobj=archive_file,mode="w:gz")as archive:
    archive.add(snapshot,arcname="server/data/mission-control.db")
    for relative in ["server/data/local-mfa.key","server/uploads","server/.env",".env"]:
     item=root/relative
     if item.exists():archive.add(item,arcname=relative,recursive=True)
  except BaseException:
   output.unlink(missing_ok=True);raise
print("Created private backup:",output)
