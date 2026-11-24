import json, hashlib, base64, zlib
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.etree import ElementTree as XML
import struct
def package_windows(base,stock,destination):
    data=memoryview(base.read_bytes())
    count=struct.unpack_from('<I',data,4)[0]
    assert data[:4]==b'RCLB' and count==2101
    pos=8
    with ZipFile(stock) as updates, ZipFile(destination,'w',ZIP_DEFLATED,compresslevel=6) as out:
        replacements=set(updates.namelist())-{'Stockroom.cxc'}
        for _ in range(count):
            n,size=struct.unpack_from('<II',data,pos)
            pos+=8
            name=bytes(data[pos:pos+n]).decode()
            pos+=n
            contents=data[pos:pos+size]
            pos+=size
            if name in replacements:
                contents=updates.read(name)
                replacements.remove(name)
            if name=='CrocodileChemistry.exe': name='RabbitChemistry.exe'
            out.writestr('Rabbit Chemistry/'+name,contents)
        assert pos==len(data) and not replacements
        scene=updates.read('Stockroom.cxc')
        assert len({p.get('class') for p in XML.fromstring(scene).iter('part') if '/chemical/' in p.get('class','')})==33
        out.writestr('Rabbit Chemistry/Reagent Stockroom.cxc',scene)
    with ZipFile(destination) as out:
        assert out.testzip() is None and out.read('Rabbit Chemistry/RabbitChemistry.exe')[:2]==b'MZ'

path=Path('downloads/Rabbit_Chemistry.apk')
patch=json.loads(Path('.github/rabbit-apk-v7.delta.json').read_text())
before=path.read_bytes()
digest=lambda data:hashlib.sha256(data).hexdigest()
if digest(before)!=patch['to']:
    assert digest(before)==patch['from']
    after=b''.join(before[o[0]:o[0]+o[1]] if isinstance(o,list) else zlib.decompress(base64.b64decode(o)) for o in patch['ops'])
    assert digest(after)==patch['to']
    path.write_bytes(after)
package_windows(Path('RL/simulator.pack'),Path('RL/reagent-library-33.zip'),Path('downloads/Rabbit-Chemistry-Windows.zip'))
