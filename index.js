const postcss = require('postcss');
const safeParser = require('postcss-safe-parser');

const eslintPlugin = {
    meta: {
        fixable: 'whitespace',
        type: 'problem',
        docs: {
            description: 'Validate and auto-indent CSS in template literals inside styles objects',
            category: 'Stylistic Issues',
            recommended: false,
        },
    },

    create(context) {
        // Detect indent style from ESLint config
        // Default to 4 spaces if not specified
        const indentOptions = context.options[0] || {};
        let indentChar = ' ';
        let indentSize = 4;

        if (indentOptions.indent) {
            // indent option may be number or string
            if (typeof indentOptions.indent === 'number') {
                indentChar = ' ';
                indentSize = indentOptions.indent;
            } else if (typeof indentOptions.indent === 'string') {
                if (indentOptions.indent.includes('\t')) {
                    indentChar = '\t';
                    indentSize = indentOptions.indent.length || 2;
                } else {
                    indentChar = ' ';
                    indentSize = indentOptions.indent.length || 4;
                }
            }
        } else {
            // fallback: try to read from eslint config settings
            const ecmaIndent = context.parserOptions?.ecmaFeatures?.jsx || false;
            // We cannot reliably get indentation from context directly otherwise
            // So we default to 4 spaces
        }

        // Prepare expected indent string
        // If tabs: 2 tabs; else spaces: 4 spaces
        let expectedIndent = '';
        if (indentChar === '\t') {
            expectedIndent = '\t'.repeat(2);
        } else {
            expectedIndent = ' '.repeat(4);
        }

        return {
            VariableDeclarator(node) {
                if (node.id.name !== 'styles' || node.init.type !== 'ObjectExpression') {
                    return;
                }

                node.init.properties.forEach((prop) => {
                    if (
                        prop.value &&
                        prop.value.type === 'TemplateLiteral' &&
                        prop.value.quasis.length === 1
                    ) {
                        const rawCss = prop.value.quasis[0].value.raw;

                        try {
                            postcss().process(rawCss, { parser: safeParser }).sync();
                        } catch (err) {
                            context.report({
                                node: prop.value,
                                message: `CSS syntax error: ${err.reason || err.message}`,
                            });
                            return;
                        }

                        const lines = rawCss.split('\n');
                        const contentLines = lines.slice(1, lines.length - 1);

                        let needsFix = false;

                        contentLines.forEach((line) => {
                            if (line.length > 0 && !line.startsWith(expectedIndent)) {
                                needsFix = true;
                            }
                        });

                        if (needsFix) {
                            const fixedCss = [
                                lines[0],
                                ...contentLines.map((line) =>
                                    line.length > 0 ? expectedIndent + line.trimStart() : line
                                ),
                                lines[lines.length - 1],
                            ].join('\n');

                            context.report({
                                node: prop.value.quasis[0],
                                message: `CSS inside template literal should be indented by ${indentChar === '\t' ? '2 tabs' : '4 spaces'
                                    }`,
                                fix(fixer) {
                                    return fixer.replaceText(
                                        prop.value.quasis[0],
                                        '`' + fixedCss + '`'
                                    );
                                },
                            });
                        }
                    }
                });
            },
        };
    },
};

module.exports = {
    rules: {
        'css-template': eslintPlugin,
    },
    configs: {
        recommended: {
            plugins: [
                '@zentus/eslint-plugin-vite-nice-css-plugin',
                '@zentus/vite-nice-css-plugin'
            ],
            rules: {
                'css-template': 'error',
            },
        },
    },
};
