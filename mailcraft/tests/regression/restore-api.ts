// After the api layer: put the links master back exactly as it was (see links-master.ts).
import { restoreLinksMaster } from './links-master'

const out = process.argv[2]
if (!out) throw new Error('usage: restore-api.ts <outDir>')

restoreLinksMaster(out)
  .then((done) => console.log(done ? 'api cleanup: links master restored' : 'api cleanup: nothing to restore'))
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => setTimeout(() => process.exit(), 100))
