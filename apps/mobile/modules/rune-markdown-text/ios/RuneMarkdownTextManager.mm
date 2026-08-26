#import <React/RCTViewManager.h>
#import <React/RCTUIManager.h>
#import "RCTBridge.h"
#import "Utils.h"

@interface RUNEMarkdownTextManager : RCTViewManager
@end

@implementation RUNEMarkdownTextManager

RCT_EXPORT_MODULE(RUNEMarkdownText)

- (UIView *)view
{
  return [[UIView alloc] init];
}

RCT_CUSTOM_VIEW_PROPERTY(color, NSString, UIView)
{
}

@end

@interface RUNEMarkdownTextRunManager : RCTViewManager
@end

@implementation RUNEMarkdownTextRunManager

RCT_EXPORT_MODULE(RUNEMarkdownTextRun)

- (UIView *)view
{
  return nil;
}

@end
