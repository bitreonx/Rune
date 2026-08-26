#pragma once

#include <react/renderer/components/RUNEMarkdownTextSpec/EventEmitters.h>
#include <react/renderer/components/RUNEMarkdownTextSpec/Props.h>
#include <react/renderer/components/RUNEMarkdownTextSpec/States.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>

namespace facebook::react {
extern const char RUNEMarkdownTextRunComponentName[];

using RUNEMarkdownTextRunShadowNode = ConcreteViewShadowNode<
    RUNEMarkdownTextRunComponentName,
    RUNEMarkdownTextRunProps,
    RUNEMarkdownTextRunEventEmitter,
    RUNEMarkdownTextRunState>;
}
