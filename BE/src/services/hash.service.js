import bcrypt from 'bcrypt'

class HashService {
    async hash({ string }) {
        const saltRound = 10;
        return await bcrypt.hash(string, saltRound)
    }

    async compare({ string, hashed }){
        return await bcrypt.compare(string, hashed)
    }
}

export default HashService