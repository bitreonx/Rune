#pragma once

#include "RUNEMarkdownTextShadowNode.h"

#include <react/renderer/core/ConcreteComponentDescriptor.h>
#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>

namespace facebook::react {
using RUNEMarkdownTextComponentDescriptor = ConcreteComponentDescriptor<RUNEMarkdownTextShadowNode>;

void RUNEMarkdownTextSpec_registerComponentDescriptorsFromCodegen(
  std::shared_ptr<const ComponentDescriptorProviderRegistry> registry);
}
