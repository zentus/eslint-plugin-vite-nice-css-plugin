declare module '@zentus/eslint-plugin-vite-nice-css-plugin' {
    import { Linter } from 'eslint';
    const plugin: {
        rules: {
            'css-template': Linter.RuleModule;
        };
        configs: {
            recommended: Linter.Config;
        };
    };
    export = plugin;
}