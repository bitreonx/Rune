#import <React/RCTViewManager.h>
#import <React/RCTUIManager.h>
#import "RCTBridge.h"
#import "Utils.h"

@interface RuneMarkdownTextManager : RCTViewManager
@end

@implementation RuneMarkdownTextManager

RCT_EXPORT_MODULE(RuneMarkdownText)

- (UIView *)view
{
  return [[UIView alloc] init];
}

RCT_CUSTOM_VIEW_PROPERTY(color, NSString, UIView)
{
}

@end

@interface RuneMarkdownTextRunManager : RCTViewManager
@end

@implementation RuneMarkdownTextRunManager

RCT_EXPORT_MODULE(RuneMarkdownTextRun)

- (UIView *)view
{
  return nil;
}

@end
