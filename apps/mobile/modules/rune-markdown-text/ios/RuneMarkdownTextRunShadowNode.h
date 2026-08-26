#pragma once

#include <react/renderer/components/RuneMarkdownTextSpec/EventEmitters.h>
#include <react/renderer/components/RuneMarkdownTextSpec/Props.h>
#include <react/renderer/components/RuneMarkdownTextSpec/States.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>

namespace facebook::react {
extern const char RuneMarkdownTextRunComponentName[];

using RuneMarkdownTextRunShadowNode = ConcreteViewShadowNode<
    RuneMarkdownTextRunComponentName,
    RuneMarkdownTextRunProps,
    RuneMarkdownTextRunEventEmitter,
    RuneMarkdownTextRunState>;
}
