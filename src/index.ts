import fastify from 'fastify'
import fastifyEnv from '@fastify/env'
import { Client } from '@notionhq/client'

import { toCamelCase } from './utils/toCamelCase'
import { type TaggedType } from './types'
import { type QueryDatabaseResponse } from '@notionhq/client/build/src/api-endpoints'

const schema = {
    type: 'object',
    required: ['PORT'],
    properties: {
        PORT: {
            type: 'string',
            default: 3000,
        },
    },
}

const options = { schema, dotenv: true }

let notion: Client

const getEnv = () => {
    return process.env as Record<
        | 'NOTION_API_SECRET'
        | 'NOTION_ARTICLES_DATABASE_ID'
        | 'NOTION_USERS_DATABASE_ID'
        | 'PORT',
        string
    >
}

const server = fastify()

server.register(fastifyEnv, options).ready(error => {
    if (error) {
        console.error(error)
    }
    const { NOTION_API_SECRET, PORT } = getEnv()

    if (!NOTION_API_SECRET) {
        throw new Error('Env variables is not defined')
    }

    notion = new Client({ auth: NOTION_API_SECRET })

    server.listen(
        { port: PORT ? +PORT : 8000 /* , host: '0.0.0.0' */ },
        (err, address) => {
            if (err) {
                console.error(err)
                process.exit(1)
            }
            console.log(`Server listening at ${address}`)
        },
    )
})

function lowercase(value: string) {
    return value.toLowerCase()
}

type CreatedTimeBlock = {
    type: 'created_time'
    created_time: string
}
type FilesBlock = {
    type: 'files'
    files: { file: { url: string } }[]
}
type UniqueIdBlock = {
    type: 'unique_id'
    unique_id: { number: number; prefix: string | null }
}
type TitleBlock = {
    type: 'title'
    title: [{ text: { content: string } }]
}
type RelationBlock = {
    type: 'relation'
    relation: { id: string }[]
}
type RichTextBlock = {
    type: 'rich_text'
    rich_text: {
        id: string
        type: string
        text: { content: string; link: null }
        annotations: {
            bold: boolean
            italic: boolean
            strikethrough: boolean
            underline: boolean
            code: boolean
            color: string
        }
        plain_text: string
        href: null
    }[]
}
type EmailBlock = {
    type: 'email'
    email: string
}
type SelectBlock = {
    type: 'select'
    select: {
        id: string
        name: string
        color: string
    }
    name: string
}

type Block =
    | CreatedTimeBlock
    | FilesBlock
    | UniqueIdBlock
    | TitleBlock
    | RelationBlock
    | RichTextBlock
    | EmailBlock
    | SelectBlock

function getValueByBlockType(block: Block) {
    switch (block.type) {
        case 'created_time':
            return block.created_time
        case 'unique_id':
            return block.unique_id.number
        case 'title':
            return block.title[0]?.text.content
        case 'files':
            return block.files[0].file.url
        case 'email':
            return block.email
        case 'relation':
            return block.relation[0].id
        case 'rich_text':
            return block.rich_text[0].text.content
        case 'select':
            return block.select.name
        default:
            return block
    }
}

type NormalizedName = TaggedType<string>
const normalizeBlockName = (name: string): NormalizedName =>
    toCamelCase(lowercase(name))

function getNotionDatabaseEntity(
    mapNames: Record<string, string>,
    response: QueryDatabaseResponse,
) {
    const fieldNames = Object.keys(mapNames)
    const items: any[] = []

    response.results.forEach(dbRow => {
        if ('properties' in dbRow) {
            const { id, properties } = dbRow

            const item = Object.entries(properties).reduce(
                (total, [name, block]) => {
                    if (!fieldNames.includes(name)) return total

                    const key = mapNames[name]
                    const value = getValueByBlockType(block as Block)

                    return {
                        ...total,
                        [key]: value,
                    }
                },
                {},
            )

            items.push({ id, ...item })
        }
    })

    return items
}

async function getArticles() {
    try {
        const { NOTION_ARTICLES_DATABASE_ID } = getEnv()

        const response = await notion.databases.query({
            database_id: NOTION_ARTICLES_DATABASE_ID,
            sorts: [
                {
                    direction: 'ascending',
                    property: 'ID',
                },
            ],
        })

        return getNotionDatabaseEntity(
            {
                Title: 'title',
                Preview: 'preview',
                'Created time': 'createdTime',
                Author: 'authorId',
            },
            response,
        )
    } catch (error: any) {
        console.error(error.body)
    }
}

async function getUsers() {
    const { NOTION_USERS_DATABASE_ID } = getEnv()

    const response = await notion.databases.query({
        database_id: NOTION_USERS_DATABASE_ID,
    })

    return getNotionDatabaseEntity(
        {
            Name: 'name',
            Role: 'role',
            Email: 'email',
            Password: 'password',
        },
        response,
    )
}

server.get('/api/articles', async (request, reply) => {
    const articles = await getArticles()
    const users = await getUsers()

    const json = { articles, users }

    return reply.code(200).type('application/json').send(json)
})

server.get('/api/users', async (request, reply) => {
    const users = await getUsers()
    const json = { users }

    return reply.code(200).type('application/json').send(json)
})

server.get('/api', async (request, reply) => {
    return reply.code(200).type('application/json').send({
        application: 'worked',
    })
})

export default async (req: Request, res: Response) => {
    await server.ready()
    server.server.emit('request', req, res)
}
