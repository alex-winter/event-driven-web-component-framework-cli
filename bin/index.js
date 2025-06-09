#!/usr/bin/env node

import prompts from 'prompts'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function installDependencies(targetDir: string) {
    try {
        const { stdout, stderr } = await execAsync('npm install serve open', { cwd: targetDir })
        console.log(stdout)
        if (stderr) console.error(stderr)
    } catch (error) {
        console.error('❌ Failed to install dependencies:', error)
    }
}

async function buildProject(targetDir: string) {
    console.log(`🔧 Building project with Webpack...`)
    try {
        const { stdout, stderr } = await execAsync('npx webpack', { cwd: targetDir })
        console.log(stdout)
        if (stderr) console.error(stderr)
    } catch (error) {
        console.error('❌ Webpack build failed:', error)
        process.exit(1)
    }
}

async function serveAndOpen(targetDir: string) {
    const port = 3000
    const serveProcess = exec(`npx serve public -l ${port}`, { cwd: targetDir })

    serveProcess.stdout?.on('data', data => {
        process.stdout.write(data)
    })
    serveProcess.stderr?.on('data', data => {
        process.stderr.write(data)
    })

    setTimeout(() => {
        exec(`npx open http://localhost:${port}`)
    }, 2000)
}

async function main() {
    const response = await prompts({
        type: 'text',
        name: 'name',
        message: '🛠  What is your project called?',
        initial: 'my-web-component'
    })

    const projectName = response.name
    const targetDir = path.join(process.cwd(), projectName)

    if (await fs.pathExists(targetDir)) {
        console.error(`❌ Directory "${projectName}" already exists.`)
        process.exit(1)
    }

    await fs.mkdirp(targetDir)

    console.log(`📁 Creating project in ${targetDir}`)

    await fs.outputFile(path.join(targetDir, 'public', 'index.html'), `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ooo</title>
    <script src="./dist/index.js"></script>
</head>
<body></body>
</html>
    `.trim())

    await fs.outputFile(path.join(targetDir, 'src', 'Events.ts'), `
import { Events as BaseEvents } from 'event-driven-web-components/dist/Events'

export class Events extends BaseEvents { }
    `.trim())

    await fs.outputFile(path.join(targetDir, 'src', 'Component.ts'), `
import { Component as BaseComponent } from 'event-driven-web-components/dist/Component'
import { Listeners as BaseListeners } from 'event-driven-web-components/dist/types/Listeners'
import { ExternalListeners as BaseExternalListeners } from 'event-driven-web-components/dist/types/ExternalListeners'
import { EventFn as BaseEventFn } from 'event-driven-web-components/dist/types/EventFn'

export type EventFn = BaseEventFn
export type ExternalListeners = BaseExternalListeners
export type Listeners = BaseListeners

export abstract class Component extends BaseComponent {
    protected get globalStylesheets(): string[] {
        return [
            // '/dist/index.css'
        ]
    }
}
    `.trim())

    await fs.outputFile(path.join(targetDir, 'src', 'Components', 'App.ts'), `
import { Component } from 'Component'

export class App extends Component {
    protected build(): HTMLElement {
        const container = document.createElement('div')
        container.classList.add('app-container')

        const heading = document.createElement('h1')
        heading.textContent = '👋 Hello, Web Components!'
        heading.classList.add('app-heading')

        const subtitle = document.createElement('p')
        subtitle.textContent = 'This is your first event-driven component ✨'
        subtitle.classList.add('app-subtitle')

        container.appendChild(heading)
        container.appendChild(subtitle)

        return container
    }

    protected css(): string {
        return /*css*/ \`
            .app-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                font-family: sans-serif;
                background-color: #fefefe;
                color: #333;
            }

            .app-heading {
                margin-bottom: 0.5rem;
                font-size: 2rem;
            }

            .app-subtitle {
                font-size: 1rem;
                opacity: 0.75;
            }
        \`
    }
}
    `.trim())

    await fs.outputFile(path.join(targetDir, 'src', 'config.ts'), `
import { App } from 'Components/App'

export const COMPONENTS = new Map<CustomElementConstructor, string>([
    [App, 'app-root'],
])
    `.trim())

    await fs.outputFile(path.join(targetDir, 'src', 'index.ts'), `
import { COMPONENTS } from 'config'

for (const [constructor, tag] of COMPONENTS) {
    customElements.define(tag, constructor)
}

document.addEventListener('DOMContentLoaded', () => {
    document.body.append(document.createElement('app-root'))
})
    `.trim())

    await fs.outputFile(path.join(targetDir, 'README.md'), `# ${projectName}`)

    await fs.outputFile(path.join(targetDir, '.gitignore'), `
node_modules
public/dist/*
    `.trim())

    await fs.outputFile(path.join(targetDir, 'webpack.config.js'), `
const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
    mode: 'development',
    entry: {
        index: './src/index.ts',
    },
    module: {
        rules: [
            {
                test: /\\.tsx?$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: path.resolve(__dirname, 'tsconfig.json'),
                        },
                    },
                ],
                exclude: /node_modules/,
            },
            {
                test: /\\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader'
                ],
            },
        ],
    },
    resolve: {
        modules: [path.resolve(__dirname, 'src'), 'node_modules'],
        extensions: ['.tsx', '.ts', '.js', '.css'],
    },
    output: {
        filename: '[name].js',
        chunkFilename: '[name].js',
        path: path.resolve(__dirname, 'public', 'dist'),
        clean: true,
    },
    devtool: 'source-map',
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].css',
        }),
    ],
}
    `.trim())

    await fs.outputFile(path.join(targetDir, 'package.json'), JSON.stringify({
        name: projectName,
        scripts: {
            watch: "webpack --watch"
        },
        dependencies: {
            "event-driven-web-components": "^2.0.4",
            "express": "^4.21.2",
            "multer": "^1.4.5-lts.2",
            "uuid": "^11.1.0"
        },
        devDependencies: {
            "@types/express": "^5.0.1",
            "@types/multer": "^1.4.12",
            "@typescript-eslint/eslint-plugin": "^7.15.0",
            "@typescript-eslint/parser": "^7.15.0",
            "css-loader": "^7.1.2",
            "file-loader": "^6.2.0",
            "mini-css-extract-plugin": "^2.9.2",
            "sass": "^1.77.8",
            "sass-loader": "^14.2.1",
            "style-loader": "^4.0.0",
            "ts-loader": "^9.2.6",
            "tslint": "^6.1.3",
            "typescript": "^4.9.5",
            "webpack": "^5.38.1",
            "webpack-cli": "^4.7.2",
            "webpack-node-externals": "^3.0.0",
            "serve": "^14.2.1",
            "open": "^9.0.0"
        }
    }, null, 2))

    await fs.outputFile(path.join(targetDir, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
            target: "esnext",
            module: "commonjs",
            outDir: "./public/dist",
            baseUrl: "src",
            sourceMap: true,
            strict: true,
            lib: ["dom", "es6"],
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true
        },
        include: ["src/**/*"],
        exclude: ["node_modules"]
    }, null, 2))

    await installDependencies(targetDir)
    await buildProject(targetDir)
    await serveAndOpen(targetDir)
}

main()
