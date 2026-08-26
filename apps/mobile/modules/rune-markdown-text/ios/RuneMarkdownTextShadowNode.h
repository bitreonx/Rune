#pragma once

#include <react/renderer/components/RuneMarkdownTextSpec/EventEmitters.h>
#include <react/renderer/components/RuneMarkdownTextSpec/Props.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/textlayoutmanager/TextLayoutManager.h>
#include <react/renderer/core/LayoutContext.h>
#include <react/renderer/core/ShadowNode.h>

#include <string>
#include <vector>

namespace facebook::react {

extern const char RuneMarkdownTextComponentName[];

struct RuneMarkdownTextParagraphStyleRange {
  size_t location;
  size_t length;
  Float firstLineHeadIndent;
  Float headIndent;
  Float paragraphSpacing;
};

struct RuneMarkdownTextAttachmentRange {
  size_t location;
  size_t length;
  std::string imageUri;
};

inline Float RuneMarkdownTextAttachmentSize(const RuneMarkdownTextAttachmentRange &) {
  return 14;
}

inline Float RuneMarkdownTextAttachmentBaselineOffset(
    const RuneMarkdownTextAttachmentRange &) {
  return -2;
}

class RuneMarkdownTextStateReal final {
 public:
  AttributedString attributedString;
  std::vector<RuneMarkdownTextParagraphStyleRange> paragraphStyleRanges;
  std::vector<RuneMarkdownTextAttachmentRange> attachmentRanges;
};

class RuneMarkdownTextShadowNode final : public ConcreteViewShadowNode<
RuneMarkdownTextComponentName,
RuneMarkdownTextProps,
RuneMarkdownTextEventEmitter,
RuneMarkdownTextStateReal> {
public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;

  RuneMarkdownTextShadowNode(
   const ShadowNode& sourceShadowNode,
   const ShadowNodeFragment& fragment
  );

  static ShadowNodeTraits BaseTraits() {
    auto traits = ConcreteViewShadowNode::BaseTraits();
    traits.set(ShadowNodeTraits::Trait::LeafYogaNode);
    traits.set(ShadowNodeTraits::Trait::MeasurableYogaNode);
    return traits;
  }

  void layout(LayoutContext layoutContext) override;

  Size measureContent(
      const LayoutContext& layoutContext,
      const LayoutConstraints& layoutConstraints) const override;

private:
  mutable AttributedString _attributedString;
  mutable std::vector<RuneMarkdownTextParagraphStyleRange> _paragraphStyleRanges;
  mutable std::vector<RuneMarkdownTextAttachmentRange> _attachmentRanges;
};
} // namespace facebook::React
