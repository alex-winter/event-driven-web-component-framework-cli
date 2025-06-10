export function makeComponent(className, verbose) {
    let output = `
    import { Component, Listeners, ExternalListeners } from 'Component'

    export class ${className} extends Component {
    `
    if (verbose) {
        output += `
        protected readonly externalListeners: ExternalListeners = {
            //'the-thing-happened': this.handleTheThing,
        }

        protected readonly listeners: Listeners = {
            //'.placeholder:click': this.handleClick,
        }

        protected async setup(): Promise<void> {

        }
        `
    }

    output += `
        protected css(): string {
            return /*css*/ \`
            
            \`
        }

        protected build(): HTMLElement {
            const container = document.createElement('div')
                
            // content here

            return container
        }
    `

    if (verbose) {
        output += `
        protected afterBuild(): void {
        
        }

        protected afterPatch(): void {
        
        }
        `
    }

    output += `
    }
    `

    return output.trim()
}